import { pool, logger } from '@medguard360/shared';

export async function recordEligibilityX12Audit(entry: {
  subscriberId: string;
  traceId: string;
  adapterMode: string;
  raw271: string;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO nctracks_x12_audit (
         direction, transaction_type, patient_control_number, payload, adapter_mode
       ) VALUES ('inbound', '271', $1, $2, $3)`,
      [entry.subscriberId, entry.raw271, entry.adapterMode],
    );
  } catch (err) {
    logger.warn('nctracks eligibility audit failed (non-fatal)', {
      traceId: entry.traceId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}