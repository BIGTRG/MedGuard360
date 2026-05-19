import { withRlsContext, AuthClaims, NotFoundError, query } from '@medguard360/shared';
import { CrisisPlanRow, AlertRow, AlertSource, AlertSeverity } from './types';

export async function createPlan(auth: AuthClaims, input: {
  patientId: string; stateCode: string; createdByProviderId: string;
  warningSigns?: string[]; internalCopingStrategies?: string[];
  socialSupports?: unknown[]; professionalSupports?: unknown[];
  emergencyContacts?: unknown[]; safeEnvironmentSteps?: string[];
  reasonsForLiving?: string;
}): Promise<CrisisPlanRow> {
  return withRlsContext(auth, async (client) => {
    // Retire any existing active plan first
    await client.query(`UPDATE crisis_plans SET status = 'retired' WHERE patient_id = $1 AND status = 'active'`, [input.patientId]);
    const r = await client.query<CrisisPlanRow>(
      `INSERT INTO crisis_plans (
         patient_id, state_code, created_by_provider_id,
         warning_signs, internal_coping_strategies,
         social_supports, professional_supports, emergency_contacts,
         safe_environment_steps, reasons_for_living
       ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10) RETURNING *`,
      [input.patientId, input.stateCode, input.createdByProviderId,
       input.warningSigns ?? [], input.internalCopingStrategies ?? [],
       JSON.stringify(input.socialSupports ?? []),
       JSON.stringify(input.professionalSupports ?? []),
       JSON.stringify(input.emergencyContacts ?? []),
       input.safeEnvironmentSteps ?? [], input.reasonsForLiving ?? null],
    );
    return r.rows[0];
  });
}

export async function getActivePlanForPatient(auth: AuthClaims, patientId: string): Promise<CrisisPlanRow | null> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<CrisisPlanRow>(
      `SELECT * FROM crisis_plans WHERE patient_id = $1 AND status = 'active' LIMIT 1`,
      [patientId],
    );
    return r.rows[0] ?? null;
  });
}

export async function createAlert(input: {
  patientId?: string; stateCode: string; source: AlertSource; severity: AlertSeverity;
  signals: unknown; detectorEngineVersion?: string; correlationId?: string; createdBy?: string;
}): Promise<AlertRow> {
  // No RLS — alerts can be created by background consumers without an auth context.
  const r = await query<AlertRow>(
    'crisis.createAlert',
    `INSERT INTO crisis_alerts (patient_id, state_code, source, severity, signals,
                                 detector_engine_version, correlation_id, created_by)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8) RETURNING *`,
    [input.patientId ?? null, input.stateCode, input.source, input.severity,
     JSON.stringify(input.signals), input.detectorEngineVersion ?? null,
     input.correlationId ?? null, input.createdBy ?? null],
  );
  return r.rows[0];
}

export async function listActiveAlerts(auth: AuthClaims, limit = 100): Promise<AlertRow[]> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<AlertRow>(
      `SELECT * FROM crisis_alerts
        WHERE status IN ('active','responder_dispatched')
        ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
                 detected_at DESC
        LIMIT $1`,
      [limit],
    );
    return r.rows;
  });
}

export async function setAlertStatus(auth: AuthClaims, id: string, status: 'responder_dispatched' | 'resolved' | 'false_alarm', notes?: string): Promise<AlertRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<AlertRow>(
      `UPDATE crisis_alerts
         SET status = $2,
             resolution_notes = COALESCE($3, resolution_notes),
             resolved_at = CASE WHEN $2 IN ('resolved','false_alarm') THEN now() ELSE resolved_at END,
             resolved_by = CASE WHEN $2 IN ('resolved','false_alarm') THEN $4 ELSE resolved_by END
       WHERE id = $1 RETURNING *`,
      [id, status, notes ?? null, auth.sub],
    );
    if (!r.rows[0]) throw new NotFoundError('Crisis alert');
    return r.rows[0];
  });
}

export async function recordDispatch(auth: AuthClaims, alertId: string, responderUserId: string, biometricVerified: boolean): Promise<void> {
  await withRlsContext(auth, async (client) => {
    await client.query(
      `INSERT INTO responder_dispatches (alert_id, responder_user_id, biometric_verified, accessed_plan)
       VALUES ($1, $2, $3, TRUE)`,
      [alertId, responderUserId, biometricVerified],
    );
    await client.query(`UPDATE crisis_alerts SET status = 'responder_dispatched' WHERE id = $1 AND status = 'active'`, [alertId]);
  });
}
