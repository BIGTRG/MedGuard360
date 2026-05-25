/**
 * Clinical Decision Support (CDS) — fires rules against the patient chart.
 *
 * Categories:
 *   - drug_drug:       active med X + active med Y interaction
 *   - drug_allergy:    active med vs documented allergy
 *   - drug_diagnosis:  drug appropriate for diagnosis
 *   - preventive:      USPSTF / ACIP / ACOG screenings overdue
 *   - chronic_mgmt:    diabetes/HTN/CKD monitoring overdue
 *   - high_risk_med:   warfarin INR, opioid PDMP query, etc.
 *
 * Engine reads `ehr_cds_rules` (seeded in migration 0028) and evaluates each
 * rule's trigger_logic against the chart snapshot. Firings persist to
 * `ehr_cds_firings` so the provider can acknowledge/override with a reason.
 */

import { query } from '@medguard360/shared';
import { ChartSnapshot } from './ehr';

export interface CdsRule {
  id: string;
  rule_key: string;
  category: 'drug_drug'|'drug_allergy'|'drug_diagnosis'|'preventive'|'chronic_mgmt'|'high_risk_med';
  severity: 'info'|'warning'|'critical';
  rule_text: string;
  trigger_logic: Record<string, unknown>;
  source_citation: string | null;
  active: boolean;
}

export interface CdsFiring {
  rule: CdsRule;
  triggered: boolean;
  reason: string;
}

export async function loadActiveRules(): Promise<CdsRule[]> {
  const r = await query<CdsRule>('cds.rules', `SELECT * FROM ehr_cds_rules WHERE active = TRUE`);
  return r.rows;
}

/** Evaluate all active rules against a chart snapshot. */
export function evaluateRules(chart: ChartSnapshot, rules: CdsRule[]): CdsFiring[] {
  const out: CdsFiring[] = [];
  for (const rule of rules) {
    const trig = rule.trigger_logic;
    let triggered = false;
    let reason = '';

    if (rule.category === 'high_risk_med' && typeof trig.medication_active === 'string') {
      const onMed = chart.activeMedications.find(m =>
        m.drug_name.toLowerCase().includes((trig.medication_active as string).toLowerCase()));
      if (onMed && typeof trig.missing_lab === 'string' && typeof trig.window_days === 'number') {
        const lab = chart.labs.find(l => l.loinc_code === trig.missing_lab);
        const cutoff = Date.now() - (trig.window_days as number) * 86_400_000;
        const missing = !lab || new Date(lab.resulted_at).getTime() < cutoff;
        if (missing) {
          triggered = true;
          reason = `Patient on ${onMed.drug_name} but no ${trig.missing_lab} result in last ${trig.window_days} days.`;
        }
      }
    }

    if (rule.category === 'chronic_mgmt' && typeof trig.diagnosis_icd10_prefix === 'string') {
      const dxMatch = chart.activeProblems.some(p => p.icd10_code.startsWith(trig.diagnosis_icd10_prefix as string));
      if (dxMatch && typeof trig.missing_lab === 'string' && typeof trig.window_days === 'number') {
        const lab = chart.labs.find(l => l.loinc_code === trig.missing_lab);
        const cutoff = Date.now() - (trig.window_days as number) * 86_400_000;
        const missing = !lab || new Date(lab.resulted_at).getTime() < cutoff;
        if (missing) {
          triggered = true;
          reason = `Active diagnosis matching ${trig.diagnosis_icd10_prefix} without ${trig.missing_lab} in last ${trig.window_days} days.`;
        }
      }
    }

    if (rule.category === 'preventive' && typeof trig.cvx === 'string' && typeof trig.window_days === 'number') {
      const lastVax = chart.immunizations
        .filter(i => i.cvx_code === trig.cvx)
        .sort((a, b) => b.administered_date.localeCompare(a.administered_date))[0];
      const cutoff = Date.now() - (trig.window_days as number) * 86_400_000;
      const overdue = !lastVax || new Date(lastVax.administered_date).getTime() < cutoff;
      if (overdue) {
        triggered = true;
        reason = `Last CVX ${trig.cvx} ${lastVax ? 'on ' + lastVax.administered_date : 'never'} — overdue.`;
      }
    }

    // drug_allergy — check active med vs active allergy by overlap of allergen text in drug name
    if (rule.category === 'drug_allergy') {
      for (const med of chart.activeMedications) {
        for (const allergy of chart.activeAllergies) {
          const allergen = allergy.allergen_text.toLowerCase();
          if (allergen.length > 3 && med.drug_name.toLowerCase().includes(allergen)) {
            triggered = true;
            reason = `Active med ${med.drug_name} overlaps with documented allergy: ${allergy.allergen_text} (${allergy.reaction_severity}).`;
            break;
          }
        }
        if (triggered) break;
      }
    }

    if (triggered) out.push({ rule, triggered: true, reason });
  }
  return out;
}

/** Persist a CDS firing so the provider can acknowledge/override. */
export async function recordFiring(input: {
  ruleId: string; patientId: string; encounterId?: string;
  context?: Record<string, unknown>;
}): Promise<string> {
  const r = await query<{ id: string }>('cds.firing',
    `INSERT INTO ehr_cds_firings (rule_id, patient_id, encounter_id, context)
     VALUES ($1, $2, $3, COALESCE($4::jsonb, '{}'::jsonb)) RETURNING id`,
    [input.ruleId, input.patientId, input.encounterId ?? null,
      input.context ? JSON.stringify(input.context) : null]);
  return r.rows[0].id;
}

export async function acknowledgeFiring(firingId: string, userId: string, actionTaken: string, overrideReason?: string): Promise<void> {
  await query('cds.ack',
    `UPDATE ehr_cds_firings SET
       user_acknowledged = TRUE,
       acknowledged_by = $2,
       acknowledged_at = now(),
       action_taken = $3,
       override_reason = $4
     WHERE id = $1`,
    [firingId, userId, actionTaken, overrideReason ?? null]);
}
