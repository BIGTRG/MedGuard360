/**
 * Rule-based chatbot response generator for the hub service.
 *
 * Generates intent-appropriate responses for callers. In production this can
 * be swapped for an LLM call while keeping the same generateResponse() signature.
 */

import { CallIntent } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateResponseParams {
  intent: string;
  stateCode: string;
  message: string;
  history: ChatMessage[];
}

// ---------------------------------------------------------------------------
// Response templates per intent
// ---------------------------------------------------------------------------

const RESPONSES: Record<CallIntent, (stateCode: string, history: ChatMessage[]) => string> = {
  eligibility: (stateCode, history) => {
    if (history.length === 0) {
      return (
        `I can help check your Medicaid eligibility for ${stateCode}. ` +
        'Please provide your Medicaid ID and date of birth, and I will verify your coverage.'
      );
    }
    return (
      'Thank you. I am looking up your eligibility now. ' +
      'This usually takes just a moment. If you have your Medicaid ID handy that will speed things up.'
    );
  },

  prior_auth: (_stateCode, _history) =>
    "For prior authorization questions, I'll connect you with a PA specialist who can " +
    'check the status of your request, submit new PAs, or walk you through the criteria. ' +
    'Please have the PA reference number or the procedure code ready.',

  credentialing: (_stateCode, _history) =>
    "I can help with provider credentialing and Medicaid enrollment. " +
    "Please have your NPI number available. I'll connect you with a credentialing specialist " +
    'to review your application status or start a new application.',

  crisis: (_stateCode, _history) =>
    "I'm connecting you with a crisis counselor immediately. " +
    'You are not alone, and help is available right now. ' +
    'If you are in immediate physical danger, please call 911. ' +
    'A trained crisis counselor will be with you in just a moment.',

  fraud_report: (_stateCode, _history) =>
    'To report suspected Medicaid fraud or billing abuse, please describe what you observed. ' +
    'Your report is confidential. Include as many details as possible: ' +
    'provider name, dates of service, and what seemed incorrect or suspicious.',

  general: (_stateCode, _history) =>
    'Thank you for calling MedGuard360. How can I assist you today? ' +
    'I can help with eligibility checks, prior authorizations, provider credentialing, ' +
    'billing questions, or connect you with a specialist.',

  unknown: (_stateCode, _history) =>
    'Thank you for calling MedGuard360. How can I assist you today? ' +
    "I didn't quite catch what you need — could you please describe your question " +
    'or concern in a few words?',
};

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generate an appropriate chatbot response based on the classified intent,
 * the caller's state, their current message, and the conversation history.
 *
 * The response is always a plain string ready to be spoken or displayed.
 */
export function generateResponse(params: GenerateResponseParams): string {
  const { intent, stateCode, history } = params;

  const responseFn = RESPONSES[intent as CallIntent] ?? RESPONSES['general'];
  return responseFn(stateCode, history);
}
