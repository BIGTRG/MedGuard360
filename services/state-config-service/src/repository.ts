import { query, NotFoundError } from '@medguard360/shared';
import { StateConfigRow, PaRuleRow } from './types';

export async function getStateConfig(stateCode: string): Promise<StateConfigRow | null> {
  const result = await query<StateConfigRow>(
    'stateConfig.get',
    `SELECT id, state_code, state_name, mmis_endpoint, mmis_credentials_vault_key,
            telehealth_rules, pa_rules, timely_filing_days, fraud_thresholds,
            is_active, updated_at, created_at
       FROM state_configs
      WHERE state_code = $1`,
    [stateCode.toUpperCase()],
  );
  return result.rows[0] ?? null;
}

export async function listActiveStates(): Promise<StateConfigRow[]> {
  const result = await query<StateConfigRow>(
    'stateConfig.listActive',
    `SELECT id, state_code, state_name, mmis_endpoint, mmis_credentials_vault_key,
            telehealth_rules, pa_rules, timely_filing_days, fraud_thresholds,
            is_active, updated_at, created_at
       FROM state_configs
      WHERE is_active = TRUE
      ORDER BY state_code`,
  );
  return result.rows;
}

export async function getPaRule(
  stateCode: string,
  payerId: string,
  procedureCode: string,
): Promise<PaRuleRow | null> {
  const result = await query<PaRuleRow>(
    'stateConfig.getPaRule',
    `SELECT id, state_code, payer_id, procedure_code, requires_pa, pa_type, criteria_summary
       FROM pa_rules
      WHERE state_code    = $1
        AND payer_id      = $2
        AND procedure_code = $3
      LIMIT 1`,
    [stateCode.toUpperCase(), payerId, procedureCode],
  );
  return result.rows[0] ?? null;
}

export async function upsertStateConfig(
  data: Partial<StateConfigRow> & { state_code: string },
): Promise<StateConfigRow> {
  const stateCode = data.state_code.toUpperCase();

  // Build dynamic SET clause for all provided fields except state_code.
  const fields: string[] = [];
  const params: unknown[] = [stateCode]; // $1 = state_code for WHERE / ON CONFLICT
  let idx = 2;

  const updatable: (keyof StateConfigRow)[] = [
    'state_name',
    'mmis_endpoint',
    'mmis_credentials_vault_key',
    'telehealth_rules',
    'pa_rules',
    'timely_filing_days',
    'fraud_thresholds',
    'is_active',
  ];

  for (const col of updatable) {
    if (data[col] !== undefined) {
      const val = ['telehealth_rules', 'pa_rules', 'fraud_thresholds'].includes(col)
        ? JSON.stringify(data[col])
        : data[col];
      fields.push(`${col} = $${idx++}`);
      params.push(val);
    }
  }

  if (fields.length === 0) {
    // Nothing to update — just fetch the existing row.
    const existing = await getStateConfig(stateCode);
    if (!existing) throw new NotFoundError(`State ${stateCode}`);
    return existing;
  }

  // Always bump updated_at on write.
  fields.push(`updated_at = NOW()`);

  const result = await query<StateConfigRow>(
    'stateConfig.upsert',
    `INSERT INTO state_configs (state_code, ${updatable
      .filter(c => data[c] !== undefined)
      .join(', ')})
     VALUES ($1, ${updatable
       .filter(c => data[c] !== undefined)
       .map((_, i) => `$${i + 2}`)
       .join(', ')})
     ON CONFLICT (state_code) DO UPDATE
       SET ${fields.join(', ')}
     RETURNING id, state_code, state_name, mmis_endpoint, mmis_credentials_vault_key,
               telehealth_rules, pa_rules, timely_filing_days, fraud_thresholds,
               is_active, updated_at, created_at`,
    params,
  );
  return result.rows[0];
}
