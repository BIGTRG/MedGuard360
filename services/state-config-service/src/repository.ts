import { query, NotFoundError } from '@medguard360/shared';
import { StateConfigRow, PaRuleRow } from './types';

const STATE_CONFIG_SELECT = `
  SELECT state_code, state_name, mmis_api_endpoint, mmis_credential_vault_key,
         timely_filing_days, expedited_pa_hours, standard_pa_days, drug_pa_hours,
         telehealth_audio_only_allowed, school_based_medicaid_enabled,
         fraud_score_auto_block_threshold, fraud_score_review_threshold,
         hub_phone_number, active, created_at, updated_at, updated_by,
         mac_part_a_b, mac_dmepos, hie_name, hie_vendor, expansion_status,
         community_engagement_rules
    FROM state_configs`;

export async function getStateConfig(stateCode: string): Promise<StateConfigRow | null> {
  const result = await query<StateConfigRow>(
    'stateConfig.get',
    `${STATE_CONFIG_SELECT} WHERE state_code = $1`,
    [stateCode.toUpperCase()],
  );
  return result.rows[0] ?? null;
}

export async function listActiveStates(): Promise<StateConfigRow[]> {
  const result = await query<StateConfigRow>(
    'stateConfig.listActive',
    `${STATE_CONFIG_SELECT} WHERE active = TRUE ORDER BY state_code`,
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
    `SELECT id, state_code, payer_id, service_code, service_code_type,
            pa_required, expedited_eligible, criteria_document_id
       FROM pa_rules
      WHERE state_code = $1
        AND payer_id = $2
        AND service_code = $3
      ORDER BY effective_from DESC
      LIMIT 1`,
    [stateCode.toUpperCase(), payerId, procedureCode],
  );
  return result.rows[0] ?? null;
}

export async function upsertStateConfig(
  data: Partial<StateConfigRow> & { state_code: string },
): Promise<StateConfigRow> {
  const stateCode = data.state_code.toUpperCase();

  const fields: string[] = [];
  const params: unknown[] = [stateCode];
  let idx = 2;

  const updatable: (keyof StateConfigRow)[] = [
    'state_name',
    'mmis_api_endpoint',
    'mmis_credential_vault_key',
    'timely_filing_days',
    'expedited_pa_hours',
    'standard_pa_days',
    'drug_pa_hours',
    'telehealth_audio_only_allowed',
    'school_based_medicaid_enabled',
    'fraud_score_auto_block_threshold',
    'fraud_score_review_threshold',
    'hub_phone_number',
    'active',
  ];

  for (const col of updatable) {
    if (data[col] !== undefined) {
      fields.push(`${col} = $${idx++}`);
      params.push(data[col]);
    }
  }

  if (fields.length === 0) {
    const existing = await getStateConfig(stateCode);
    if (!existing) throw new NotFoundError(`State ${stateCode}`);
    return existing;
  }

  fields.push('updated_at = NOW()');

  const insertCols = updatable.filter(c => data[c] !== undefined);
  const result = await query<StateConfigRow>(
    'stateConfig.upsert',
    `INSERT INTO state_configs (state_code, ${insertCols.join(', ')})
     VALUES ($1, ${insertCols.map((_, i) => `$${i + 2}`).join(', ')})
     ON CONFLICT (state_code) DO UPDATE
       SET ${fields.join(', ')}
     RETURNING state_code, state_name, mmis_api_endpoint, mmis_credential_vault_key,
               timely_filing_days, expedited_pa_hours, standard_pa_days, drug_pa_hours,
               telehealth_audio_only_allowed, school_based_medicaid_enabled,
               fraud_score_auto_block_threshold, fraud_score_review_threshold,
               hub_phone_number, active, created_at, updated_at, updated_by,
               mac_part_a_b, mac_dmepos, hie_name, hie_vendor, expansion_status,
               community_engagement_rules`,
    params,
  );
  return result.rows[0];
}
