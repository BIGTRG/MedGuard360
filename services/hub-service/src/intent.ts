/**
 * Cheap intent classifier for the AI chatbot front-end of the hub.
 *
 * Production swap: a real LLM or fine-tuned classifier. For dev, regex
 * heuristics over the caller's first message work well enough.
 */

export type Intent =
  | 'eligibility' | 'claim_status' | 'provider_lookup'
  | 'prior_auth' | 'crisis' | 'complaint' | 'other';

export interface ClassifyResult {
  intent: Intent;
  confidence: number;
  shouldHandoff: boolean;
  suggestedReply: string;
}

const RULES: Array<{ intent: Intent; pattern: RegExp; reply: string; handoff?: boolean }> = [
  { intent: 'crisis',         pattern: /\b(suicide|kill (myself|me)|self.?harm|overdose|emergency)\b/i,
    reply: 'You are in the right place. I am connecting you to a crisis-trained agent now.',
    handoff: true },
  { intent: 'eligibility',    pattern: /\b(am i covered|do i have (medicaid|medicare)|coverage|eligib|insurance)\b/i,
    reply: 'I can check your eligibility. Please tell me your Medicaid ID and the service you need.' },
  { intent: 'claim_status',   pattern: /\b(claim|bill|payment|paid|denied|why.*denied)\b/i,
    reply: 'I can look up your claim. Could you share the claim number or the date of service?' },
  { intent: 'provider_lookup',pattern: /\b(find (a |me )?(doctor|therapist|specialist|provider))\b/i,
    reply: 'I can help you find a provider. What kind of care and what city or zip?' },
  { intent: 'prior_auth',     pattern: /\b(prior auth|preauth|pre.auth|authoriz)\b/i,
    reply: 'I can check on a prior authorization. Do you have the PA reference number?' },
  { intent: 'complaint',      pattern: /\b(complaint|complain|grievance|file a complaint)\b/i,
    reply: 'I can file a complaint for you. A specialist will follow up within one business day.' },
];

export function classify(message: string): ClassifyResult {
  for (const r of RULES) {
    if (r.pattern.test(message)) {
      return { intent: r.intent, confidence: 0.85, shouldHandoff: r.handoff ?? false, suggestedReply: r.reply };
    }
  }
  return {
    intent: 'other', confidence: 0.30, shouldHandoff: true,
    suggestedReply: 'Let me connect you to a human agent who can help with that.',
  };
}
