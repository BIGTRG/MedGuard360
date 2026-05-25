/**
 * Medical Loss Ratio (MLR) calculation for MCO Admin portal.
 *
 * Per 42 CFR 438.8, Medicaid MCOs must spend at least 85% of premium revenue
 * on medical care + quality improvement. The remaining ≤15% covers admin + profit.
 *
 * Formula:
 *   MLR = (incurred_claims + quality_improvement_expenditures) / (premium_revenue - tax_adjustments)
 *
 * Reporting:
 *   - Quarterly internal monitoring
 *   - Annual report to state Medicaid agency
 *   - If MLR < 85%, MCO must remit difference to state (refund)
 */

import { query } from '@medguard360/shared';

export interface MlrInputs {
  mco_payer_id: string;
  state_code: string;
  period_start: string;  // YYYY-MM-DD
  period_end:   string;
}

export interface MlrResult extends MlrInputs {
  premium_revenue_cents: number;
  incurred_claims_cents: number;
  qi_expenditures_cents: number;
  tax_adjustments_cents: number;
  mlr_ratio: number;        // 0..1+
  mlr_percent: number;       // 0..100+
  meets_85_floor: boolean;
  estimated_refund_cents: number;  // 0 if meets floor
}

export async function computeMlr(inputs: MlrInputs): Promise<MlrResult> {
  // Incurred claims = sum of total_paid_cents for claims this MCO adjudicated this period
  const claimsRes = await query<{ total: string | null }>(
    'reporting.mlr.claims',
    `SELECT COALESCE(SUM(total_paid_cents), 0)::text AS total
       FROM claims
      WHERE state_code = $1 AND payer_id = $2
        AND adjudicated_at BETWEEN $3 AND $4
        AND status = 'paid'`,
    [inputs.state_code, inputs.mco_payer_id, inputs.period_start, inputs.period_end],
  );
  const incurred = Number(claimsRes.rows[0]?.total ?? 0);

  // Premium revenue + QI + tax adjustments would come from a separate mco_financials
  // table fed by the MCO finance team via /v1/state-config/mco-financials. Here we
  // produce placeholders sized realistically (typical Standard Plan PMPM ~$280, 100K members).
  const member_months = 1_200_000;   // 12 mo * 100K members — placeholder
  const pmpm_cents    = 28_000;
  const premium       = member_months * pmpm_cents;
  const qi            = Math.round(premium * 0.015);
  const tax_adj       = Math.round(premium * 0.025);

  const denom = premium - tax_adj;
  const mlr = (incurred + qi) / denom;
  const mlrPct = mlr * 100;
  const meets = mlrPct >= 85;
  const refund = meets ? 0 : Math.round((0.85 - mlr) * denom);

  return {
    ...inputs,
    premium_revenue_cents: premium,
    incurred_claims_cents: incurred,
    qi_expenditures_cents: qi,
    tax_adjustments_cents: tax_adj,
    mlr_ratio:    mlr,
    mlr_percent:  Number(mlrPct.toFixed(2)),
    meets_85_floor: meets,
    estimated_refund_cents: refund,
  };
}
