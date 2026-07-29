import { loadNctracksConfig } from './config';
import { InMemorySftpClient, joinRemote } from './transport/sftpClient';
import { NctracksSftpAdapter } from './sftp-adapter';
import type { ClaimSubmitRequest } from './types';

const env = {
  NCTRACKS_MODE: 'sftp',
  NCTRACKS_BATCH_SFTP_HOST: 'sftp.test.local',
  NCTRACKS_BATCH_SFTP_USER: 'mg360',
  NCTRACKS_SFTP_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nstub\n-----END PRIVATE KEY-----',
};

const sampleClaim: ClaimSubmitRequest = {
  claimType: 'professional',
  patientControlNumber: 'PCN-SFTP-1',
  totalCharge: 88,
  subscriberId: 'NCMD00100007',
  serviceDateFrom: '2026-06-01',
  serviceDateTo: '2026-06-01',
  diagnoses: [{ code: 'Z00.00', system: 'ICD10CM' }],
  lines: [{
    procedureCode: '99212',
    units: 1,
    charge: 88,
    serviceDate: '2026-06-01',
    diagnosisPointers: [1],
  }],
};

describe('NctracksSftpAdapter', () => {
  const config = loadNctracksConfig(env);
  const memory = new InMemorySftpClient();
  const adapter = new NctracksSftpAdapter(config, { sftpClient: memory });
  const dirs = config.batch.sftp!.dirs;

  it('uploads 837 to inbound dir on submitClaim', async () => {
    const result = await adapter.submitClaim(sampleClaim);
    expect(result.fileName).toMatch(/^mg360_P_/);
    const remote = joinRemote(dirs.in837, result.fileName);
    const uploaded = memory.files.get(remote);
    expect(uploaded).toBeDefined();
    expect(uploaded!.content.toString('utf8')).toContain('ST*837*');
  });

  it('polls 999 and 277CA from outbound dirs', async () => {
    await memory.put(
      'AK9*A*1*1*1~',
      joinRemote(dirs.out999, 'ack999.x12'),
    );
    await memory.put(
      'STC*A0:20*20260601*WQ*PCN-SFTP-1~',
      joinRemote(dirs.out277ca, 'ack277.x12'),
    );

    const { ack999, ack277CA } = await adapter.pollAcks();
    expect(ack999).toHaveLength(1);
    expect(ack999[0]?.accepted).toBe(true);
    expect(ack277CA[0]?.perClaim[0]?.patientControlNumber).toBe('PCN-SFTP-1');
  });

  it('retrieves and parses 835 remittance files', async () => {
    const raw835 = 'ST*835*0001~TRN*1*CHK-99~CLP*PCN-1*1*100.00*80.00**MC*TCN-9~';
    await memory.put(raw835, joinRemote(dirs.out835, 'RA_20260601.835'));

    const files = await adapter.retrieveRemittances();
    expect(files).toHaveLength(1);
    expect(files[0]?.checkOrEftNumber).toBe('CHK-99');
    expect(files[0]?.claims[0]?.paidAmount).toBe(80);
  });

  it('healthCheck succeeds when inbound dir is listable', async () => {
    const health = await adapter.healthCheck();
    expect(health.sftpOk).toBe(true);
  });
});
