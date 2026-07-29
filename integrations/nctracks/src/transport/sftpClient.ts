/**
 * SFTP transport for NCTracks batch dirs (837 in, 835/999/277CA out).
 * Injectable client supports unit tests without network I/O.
 */
import type { NctracksConfig } from '../types';
import { NctracksTransportError } from '../soap-adapter';

export interface SftpFileEntry {
  name: string;
  modifyTime?: number;
  size?: number;
}

export interface SftpClientLike {
  connect(): Promise<void>;
  end(): Promise<void>;
  put(data: Buffer | string, remotePath: string): Promise<void>;
  list(dir: string): Promise<SftpFileEntry[]>;
  get(remotePath: string): Promise<Buffer>;
  delete(remotePath: string): Promise<void>;
}

type SftpConfig = NonNullable<NctracksConfig['batch']['sftp']>;

function joinRemote(dir: string, name: string): string {
  const base = dir.endsWith('/') ? dir.slice(0, -1) : dir;
  return `${base}/${name}`;
}

export class InMemorySftpClient implements SftpClientLike {
  readonly files = new Map<string, { content: Buffer; mtime: number }>();
  connected = false;

  async connect(): Promise<void> { this.connected = true; }
  async end(): Promise<void> { this.connected = false; }

  async put(data: Buffer | string, remotePath: string): Promise<void> {
    this.files.set(remotePath, { content: Buffer.from(data), mtime: Date.now() });
  }

  async list(dir: string): Promise<SftpFileEntry[]> {
    const prefix = dir.endsWith('/') ? dir : `${dir}/`;
    const out: SftpFileEntry[] = [];
    for (const [path, meta] of this.files.entries()) {
      if (!path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      if (!rest || rest.includes('/')) continue;
      out.push({ name: rest, modifyTime: meta.mtime, size: meta.content.length });
    }
    return out;
  }

  async get(remotePath: string): Promise<Buffer> {
    const hit = this.files.get(remotePath);
    if (!hit) throw new Error(`ENOENT: ${remotePath}`);
    return hit.content;
  }

  async delete(remotePath: string): Promise<void> {
    this.files.delete(remotePath);
  }
}

class Ssh2SftpClient implements SftpClientLike {
  private client: import('ssh2-sftp-client').default | null = null;

  constructor(private readonly cfg: SftpConfig) {}

  async connect(): Promise<void> {
    const SftpClient = (await import('ssh2-sftp-client')).default;
    this.client = new SftpClient();
    await this.client.connect({
      host: this.cfg.host,
      port: this.cfg.port,
      username: this.cfg.user,
      privateKey: this.cfg.keyPem,
      passphrase: this.cfg.passphrase,
      readyTimeout: 20_000,
    });
  }

  async end(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  private requireClient(): import('ssh2-sftp-client').default {
    if (!this.client) throw new NctracksTransportError('SFTP client not connected');
    return this.client;
  }

  async put(data: Buffer | string, remotePath: string): Promise<void> {
    await this.requireClient().put(Buffer.from(data), remotePath);
  }

  async list(dir: string): Promise<SftpFileEntry[]> {
    const rows = await this.requireClient().list(dir);
    return rows.map((r) => ({
      name: r.name,
      modifyTime: r.modifyTime,
      size: r.size,
    }));
  }

  async get(remotePath: string): Promise<Buffer> {
    const data = await this.requireClient().get(remotePath);
    return Buffer.isBuffer(data) ? data : Buffer.from(String(data));
  }

  async delete(remotePath: string): Promise<void> {
    await this.requireClient().delete(remotePath);
  }
}

export function createSftpClient(cfg: SftpConfig, override?: SftpClientLike): SftpClientLike {
  return override ?? new Ssh2SftpClient(cfg);
}

export { joinRemote };
