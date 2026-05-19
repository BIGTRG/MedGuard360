/**
 * Rule-based intent classifier for the hub chatbot.
 *
 * Maps caller message text to a structured intent using keyword matching.
 * Production swap: replace classifyIntent() with a fine-tuned model call
 * while keeping the same return shape.
 */

import { CallIntent } from './types';

// ---------------------------------------------------------------------------
// Keyword → intent mapping
// ---------------------------------------------------------------------------

const INTENT_KEYWORDS: Record<Exclude<CallIntent, 'unknown'>, string[]> = {
  eligibility: [
    'eligible', 'coverage', 'covered', 'medicaid', 'insurance', 'benefits',
    'enrolled', 'enrollment', 'am i covered', 'do i qualify',
  ],
  prior_auth: [
    'prior authorization', 'prior auth', 'PA', 'pre-auth', 'preauth',
    'approval', 'authorize', 'pre-authorization',
  ],
  credentialing: [
    'credential', 'license', 'enroll', 'provider application',
    'medicaid enrollment', 'credentialing', 'npi',
  ],
  crisis: [
    'crisis', 'suicidal', 'suicidality', 'danger', 'emergency',
    'harm', 'hurt myself', 'kill', 'self-harm', 'overdose',
    'end my life', 'want to die',
  ],
  fraud_report: [
    'fraud', 'abuse', 'billing error', 'overcharged', 'wrong bill',
    'false claim', 'report fraud', 'suspicious',
  ],
  general: [],
};

// Crisis takes absolute priority — checked before any other intent.
const CRISIS_PATTERNS = INTENT_KEYWORDS.crisis.map(
  (kw) => new RegExp(`\\b${kw.replace(/[-]/g, '\\-')}\\b`, 'i'),
);

// Ordered list of intents to check (crisis first, then specifics, general last)
const ORDERED_INTENTS: Array<Exclude<CallIntent, 'unknown' | 'general'>> = [
  'crisis',
  'prior_auth',
  'fraud_report',
  'credentialing',
  'eligibility',
];

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

export interface ClassifyResult {
  intent: CallIntent;
  confidence: number;
  crisisFlag: boolean;
}

/**
 * Classify the intent of a caller message.
 *
 * Returns:
 *   intent     — matched intent or 'general' for unrecognised input
 *   confidence — 0..1 score (rule-based: 0.90 on specific match, 0.40 on general)
 *   crisisFlag — true whenever crisis language is detected regardless of primary intent
 */
export function classifyIntent(text: string): ClassifyResult {
  const lower = text.toLowerCase();

  // Always check for crisis signals (may co-occur with other intents)
  const crisisFlag = CRISIS_PATTERNS.some((re) => re.test(text));

  for (const intent of ORDERED_INTENTS) {
    const keywords = INTENT_KEYWORDS[intent];
    const matched = keywords.some((kw) =>
      lower.includes(kw.toLowerCase()),
    );
    if (matched) {
      // Crisis is slightly more confident than other rules
      const confidence = intent === 'crisis' ? 0.95 : 0.90;
      return { intent, confidence, crisisFlag };
    }
  }

  // No specific intent matched
  return { intent: 'general', confidence: 0.40, crisisFlag };
}
