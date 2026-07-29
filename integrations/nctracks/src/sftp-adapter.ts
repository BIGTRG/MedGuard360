import type {
  Ack277CA, Ack999, ClaimStatusRequest, ClaimStatusResponse, ClaimSubmitRequest, ClaimSubmitResult,
  EligibilityRequest, EligibilityResponse, NctracksAdapter, NctracksConfig, NctracksMode,
  RemittanceFile, RemittanceQuery,
} from './types';
import { build837PForNctracks, claim837FileName } from './x12/build837';
import { parse277CA } from './x12/parse277ca';
import { parse835 } from './x12/parse835';
import { parse999 } from './x12/parse999';
import { NctracksTransportError } from './soap-adapter';
import { createSftpClient, joinRemote, type SftpClientLike } from './transport/sftpClient';

let icnCounter = 1;
function nextIcn(): string { return String(icnCounter++).padStart(9, '0'); }

function isoNow(): string { return new Date().toISOString(); }

function sinceMs(since?: string): number | undefined {
  if (!since) return undefined;
  const t = Date.parse(since);
  return Number.isFinite(t) ? t : undefined;
}

export interface SftpAdapterOptions {
  sftpClient?: SftpClientLike;
}

export class NctracksSftpAdapter implements NctracksAdapter {
  public readonly mode: NctracksMode = 'sftp';
  private readonly client: SftpClientLike;
  private readonly processedFiles = new Set<string>();

  constructor(public readonly config: NctracksConfig, opts: SftpAdapterOptions = {}) {
    if (!config.batch.sftp) {
      throw new Error('NCTRACKS_MODE=sftp requires NCTRACKS_BATCH_SFTP_HOST and credentials');
    }
    this.client = opts.sftpClient ?? createSftpClient(config.batch.sftp);
  }

  private async withSftp<T>(fn: (client: SftpClientLike) => Promise<T>): Promise<T> {
    try {
      await this.client.connect();
      return await fn(this.client);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new NctracksTransportError(`SFTP error: ${msg}`);
    } finally {
      await this.client.end().catch(() => undefined);
    }
  }

  async checkEligibility(_req: EligibilityRequest): Promise<EligibilityResponse> {
    throw new NctracksTransportError('270/271 requires SOAP — set NCTRACKS_MODE=live or soap');
  }

  async submitClaim(req: ClaimSubmitRequest): Promise<ClaimSubmitResult> {
    const sftp = this.config.batch.sftp!;
    const icn = nextIcn();
    const built = build837PForNctracks(req, this.config, icn);
    const fileName = claim837FileName(req, icn);
    const remotePath = joinRemote(sftp.dirs.in837, fileName);

    await this.withSftp(async (client) => {
      await client.put(built.payload, remotePath);
    });

    return {
      interchangeControlNumber: built.interchangeControlNumber,
      groupControlNumber: built.groupControlNumber,
      transactionSetControlNumber: built.transactionSetControlNumber,
      fileName,
      submittedAt: isoNow(),
    };
  }

  async getClaimStatus(_req: ClaimStatusRequest): Promise<ClaimStatusResponse> {
    throw new NctracksTransportError('276/277 requires SOAP — set NCTRACKS_MODE=live or soap');
  }

  async retrieveRemittances(q?: RemittanceQuery): Promise<RemittanceFile[]> {
    const sftp = this.config.batch.sftp!;
    const cutoff = sinceMs(q?.since);

    return this.withSftp(async (client) => {
      const entries = await client.list(sftp.dirs.out835);
      const out: RemittanceFile[] = [];

      for (const entry of entries) {
        const key = `835:${entry.name}`;
        if (this.processedFiles.has(key)) continue;
        if (cutoff && entry.modifyTime && entry.modifyTime < cutoff) continue;
        if (q?.checkNumber && !entry.name.includes(q.checkNumber)) continue;

        const remotePath = joinRemote(sftp.dirs.out835, entry.name);
        const raw = (await client.get(remotePath)).toString('utf8');
        const parsed = parse835(raw, entry.name, isoNow());

        if (q?.payerClaimControlNumber) {
          parsed.claims = parsed.claims.filter((c) => c.payerClaimControlNumber === q.payerClaimControlNumber);
          if (parsed.claims.length === 0) continue;
        }

        out.push(parsed);
        this.processedFiles.add(key);
      }
      return out;
    });
  }

  async pollAcks(since?: string): Promise<{ ack999: Ack999[]; ack277CA: Ack277CA[] }> {
    const sftp = this.config.batch.sftp!;
    const cutoff = sinceMs(since);
    const ack999: Ack999[] = [];
    const ack277CA: Ack277CA[] = [];

    await this.withSftp(async (client) => {
      for (const entry of await client.list(sftp.dirs.out999)) {
        const key = `999:${entry.name}`;
        if (this.processedFiles.has(key)) continue;
        if (cutoff && entry.modifyTime && entry.modifyTime < cutoff) continue;
        const raw = (await client.get(joinRemote(sftp.dirs.out999, entry.name))).toString('utf8');
        ack999.push(parse999(raw));
        this.processedFiles.add(key);
      }
      for (const entry of await client.list(sftp.dirs.out277ca)) {
        const key = `277CA:${entry.name}`;
        if (this.processedFiles.has(key)) continue;
        if (cutoff && entry.modifyTime && entry.modifyTime < cutoff) continue;
        const raw = (await client.get(joinRemote(sftp.dirs.out277ca, entry.name))).toString('utf8');
        ack277CA.push(parse277CA(raw));
        this.processedFiles.add(key);
      }
    });

    return { ack999, ack277CA };
  }

  async healthCheck() {
    const sftp = this.config.batch.sftp!;
    try {
      await this.withSftp(async (client) => {
        await client.list(sftp.dirs.in837);
      });
      return { realtimeOk: false, sftpOk: true };
    } catch {
      return { realtimeOk: false, sftpOk: false };
    }
  }
}
