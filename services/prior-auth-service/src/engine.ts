/**
 * Clinical Decision Engine — the core innovation of prior-auth-service.
 *
 * Pipeline:
 *   1. Fetch PA rule from state-config-service.
 *   2. Fetch criteria documents from DB (pa_criteria_documents table).
 *   3. Call pa-nlp-matcher AI engine at http://pa-nlp-matcher:8006/v1/match.
 *   4. If AI unavailable: fallback to needs_more_info for manual review.
 *   5. Aggregate criterion outcomes: all met → approve, critical not_met → deny, else needs_more_info.
 *   6. Always set routedToHuman: true (AI governance — AI never auto-decides).
 *   7. Return plain-language explanation.
 */

import { createLogger, pool } from '@medguard360/shared';
import { PaRuleResponse } from './types';

const logger = createLogger('prior-auth-service:engine');

const STATE_CONFIG_URL = process.env.STATE_CONFIG_SERVICE_URL ?? 'http://state-config-service:3018';
const PA_NLP_MATCHER_URL = process.env.PA_NLP_MATCHER_URL ?? 'http://pa-nlp-matcher:8006';

export interface EngineResult {
  recommendation: 'approve' | 'deny' | 'needs_more_info';
  confidence: number;
  explanation: string;
  criteriaEvaluations: Array<{
    criterionText: string;
    outcome: 'met' | 'not_met' | 'indeterminate';
    similarityScore: number | null;
    explanation: string;
  }>;
  routedToHuman: boolean; // always true — AI governance
}

interface NlpMatchRequest {
  clinical_text: string;
  criteria: string[];
}

interface NlpCriterionResult {
  criterion_text: string;
  similarity_score: number;
  outcome: 'met' | 'not_met' | 'indeterminate';
  explanation: string;
}

interface NlpMatchResponse {
  results: NlpCriterionResult[];
}

interface PaCriteriaDocRow {
  id: string;
  criteria_text: string;
}

/** Compute SLA deadline based on urgency type. */
export function computeDueAt(urgency: string): Date {
  const now = new Date();
  switch (urgency) {
    case 'drug':
      now.setHours(now.getHours() + 24);
      break;
    case 'expedited':
      now.setHours(now.getHours() + 72);
      break;
    case 'standard':
    default:
      now.setDate(now.getDate() + 7);
      break;
  }
  return now;
}

export async function runClinicalDecisionEngine(params: {
  procedureCode: string;
  diagnosisCodes: string[];
  clinicalJustification: string;
  urgency: string;
  stateCode: string;
  payerId: string;
  authorizationHeader?: string;
}): Promise<EngineResult> {
  const { procedureCode, diagnosisCodes, clinicalJustification, stateCode, payerId, authorizationHeader } = params;

  // ── Step 1: Fetch PA rule from state-config-service ──────────────────────
  let paRule: PaRuleResponse | null;
  try {
    const ruleUrl = `${STATE_CONFIG_URL}/api/v1/state-config/pa-rule?` +
      new URLSearchParams({ state: stateCode, payer: payerId, code: procedureCode });
    const headers: Record<string, string> = { 'x-service-caller': 'prior-auth-service' };
    if (authorizationHeader) {
      headers.authorization = authorizationHeader;
    }

    const ruleResp = await fetch(ruleUrl, {
      signal: AbortSignal.timeout(10_000),
      headers,
    });

    if (!ruleResp.ok) {
      logger.warn('state-config PA rule fetch returned non-200', { status: ruleResp.status });
      return {
        recommendation: 'needs_more_info',
        confidence: 0,
        explanation: 'Unable to retrieve PA rule from state configuration — routing to manual review.',
        criteriaEvaluations: [],
        routedToHuman: true,
      };
    }

    paRule = (await ruleResp.json()) as PaRuleResponse;
  } catch (err) {
    logger.warn('state-config-service unreachable', { error: (err as Error).message });
    return {
      recommendation: 'needs_more_info',
      confidence: 0,
      explanation: 'State configuration service unavailable — routing to manual review.',
      criteriaEvaluations: [],
      routedToHuman: true,
    };
  }

  if (!paRule) {
    return {
      recommendation: 'needs_more_info',
      confidence: 0,
      explanation: `No prior authorization rule is configured for procedure ${procedureCode} under payer ${payerId} in ${stateCode}. A prior authorization specialist must review manually.`,
      criteriaEvaluations: [],
      routedToHuman: true,
    };
  }

  if (!paRule.pa_required) {
    return {
      recommendation: 'approve',
      confidence: 1.0,
      explanation: `No prior authorization is required for procedure ${procedureCode} under payer ${payerId} in ${stateCode}.`,
      criteriaEvaluations: [],
      routedToHuman: true, // human still confirms per AI governance
    };
  }

  // ── Step 2: Fetch criteria documents from DB ─────────────────────────────
  let criteriaTexts: string[] = [];
  let criticalFlags: boolean[] = [];

  try {
    // Criteria documents are keyed by the same state/payer/service tuple as PA rules.
    const criteriaResult = await pool.query<PaCriteriaDocRow>(
      `SELECT * FROM pa_criteria_documents
       WHERE state_code = $1 AND payer_id = $2 AND service_code = $3
       ORDER BY created_at`,
      [stateCode, payerId, procedureCode],
    );

    if (criteriaResult.rows.length) {
      criteriaTexts = criteriaResult.rows.map(r => r.criteria_text);
      criticalFlags = criteriaResult.rows.map(() => false);
    } else {
      // No criteria documents on file — specialist must review
      return {
        recommendation: 'needs_more_info',
        confidence: 0,
        explanation: `Prior authorization is required for ${procedureCode}, but no coverage criteria documents are on file for payer ${payerId} in ${stateCode}. A prior authorization specialist must review manually.`,
        criteriaEvaluations: [],
        routedToHuman: true,
      };
    }
  } catch (err) {
    logger.error('failed to fetch PA criteria documents', { error: (err as Error).message });
    return {
      recommendation: 'needs_more_info',
      confidence: 0,
      explanation: 'Unable to retrieve coverage criteria — routing to manual review.',
      criteriaEvaluations: [],
      routedToHuman: true,
    };
  }

  // ── Step 3: Call pa-nlp-matcher AI engine ────────────────────────────────
  const clinicalText = [clinicalJustification, ...diagnosisCodes].join(' ');

  let nlpResponse: NlpMatchResponse;
  try {
    const matchResp = await fetch(`${PA_NLP_MATCHER_URL}/v1/match`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-service-caller': 'prior-auth-service',
      },
      body: JSON.stringify({ clinical_text: clinicalText, criteria: criteriaTexts } satisfies NlpMatchRequest),
      signal: AbortSignal.timeout(20_000),
    });

    if (!matchResp.ok) {
      throw new Error(`pa-nlp-matcher returned HTTP ${matchResp.status}`);
    }

    nlpResponse = (await matchResp.json()) as NlpMatchResponse;
  } catch (err) {
    // ── Step 4: AI unavailable fallback ─────────────────────────────────────
    logger.error('pa-nlp-matcher unreachable', { error: (err as Error).message });
    return {
      recommendation: 'needs_more_info',
      confidence: 0,
      explanation: 'AI engine unavailable — routing to manual review.',
      criteriaEvaluations: [],
      routedToHuman: true,
    };
  }

  // ── Step 5: Aggregate criterion outcomes ─────────────────────────────────
  const results = nlpResponse.results;

  const criteriaEvaluations = results.map((r, i) => ({
    criterionText: r.criterion_text,
    outcome: r.outcome,
    similarityScore: r.similarity_score ?? null,
    explanation: r.explanation,
    isCritical: criticalFlags[i] ?? false,
  }));

  const allMet = criteriaEvaluations.every(c => c.outcome === 'met');
  const criticalNotMet = criteriaEvaluations.some(c => c.isCritical && c.outcome === 'not_met');
  const anyNotMet = criteriaEvaluations.some(c => c.outcome === 'not_met');

  let recommendation: EngineResult['recommendation'];
  if (allMet) {
    recommendation = 'approve';
  } else if (criticalNotMet || anyNotMet) {
    recommendation = 'deny';
  } else {
    recommendation = 'needs_more_info';
  }

  // Confidence: average of similarity scores for met criteria
  const metScores = results.filter(r => r.outcome === 'met').map(r => r.similarity_score ?? 0);
  const confidence = metScores.length
    ? metScores.reduce((a, b) => a + b, 0) / results.length
    : 0;

  // ── Step 7: Plain-language explanation ───────────────────────────────────
  const explanation = buildExplanation(recommendation, criteriaEvaluations, procedureCode);

  return {
    recommendation,
    confidence: Math.round(confidence * 100) / 100,
    explanation,
    criteriaEvaluations: criteriaEvaluations.map(({ criterionText, outcome, similarityScore, explanation: exp }) => ({
      criterionText,
      outcome,
      similarityScore,
      explanation: exp,
    })),
    routedToHuman: true, // ── Step 6: AI governance — always route to human ──
  };
}

function buildExplanation(
  recommendation: EngineResult['recommendation'],
  evaluations: Array<{ criterionText: string; outcome: string; isCritical: boolean }>,
  procedureCode: string,
): string {
  const total = evaluations.length;
  const metCount = evaluations.filter(e => e.outcome === 'met').length;
  const notMetItems = evaluations.filter(e => e.outcome === 'not_met');
  const indetermItems = evaluations.filter(e => e.outcome === 'indeterminate');

  if (recommendation === 'approve') {
    return (
      `AI evaluation: all ${total} coverage criteria for procedure ${procedureCode} are met by the clinical documentation. ` +
      `This recommendation must be confirmed by a prior authorization specialist before final approval is issued.`
    );
  }

  if (recommendation === 'deny') {
    const notMetList = notMetItems.slice(0, 5).map(e => `  • ${e.criterionText.trim()}`).join('\n');
    return (
      `AI evaluation: ${metCount} of ${total} criteria met. The following criteria are NOT supported by the clinical documentation:\n` +
      notMetList +
      `\n\nA prior authorization specialist will perform final review before any denial is issued. ` +
      `The provider may submit additional clinical documentation to address these gaps.`
    );
  }

  // needs_more_info
  const missingList = indetermItems.slice(0, 5).map(e => `  • ${e.criterionText.trim()}`).join('\n');
  return (
    `AI evaluation is inconclusive — ${metCount} of ${total} criteria confirmed. ` +
    `Additional documentation is needed for the following criteria:\n` +
    (missingList || '  • Insufficient clinical justification provided') +
    `\n\nPlease provide supporting documentation and resubmit. ` +
    `A prior authorization specialist will conduct final review.`
  );
}
