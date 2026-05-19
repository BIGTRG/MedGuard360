/**
 * TypeScript interfaces matching the hub_calls table.
 */

export type CallerType = 'patient' | 'provider' | 'emergency_responder' | 'unknown';

export type CallIntent =
  | 'eligibility'
  | 'prior_auth'
  | 'credentialing'
  | 'crisis'
  | 'general'
  | 'fraud_report'
  | 'unknown';

export type CallResolution =
  | 'resolved'
  | 'transferred'
  | 'escalated'
  | 'callback'
  | 'abandoned';

export type CallChannel = 'phone' | 'web_chat' | 'sms';

export interface HubCallRow {
  id: string;
  state_code: string;
  caller_type: CallerType;
  caller_id: string | null;
  intent: CallIntent;
  resolution: CallResolution | null;
  channel: CallChannel;
  duration_seconds: number | null;
  recording_path: string | null;
  transcript: string | null;
  ai_classification: string | null;
  ai_confidence: number | null;
  fraud_flag: boolean;
  crisis_flag: boolean;
  created_at: Date;
  updated_at: Date;
}

/** Daily aggregated stats returned by getDailyStats */
export interface DailyStatRow {
  intent: string;
  count: number;
}

/** Input for creating a new call */
export interface CreateCallInput {
  stateCode: string;
  callerType: CallerType;
  callerId?: string;
  channel: CallChannel;
}

/** Input for updating a call mid-session */
export interface UpdateCallInput {
  intent?: CallIntent;
  aiClassification?: string;
  aiConfidence?: number;
  crisisFlag?: boolean;
  fraudFlag?: boolean;
  transcript?: string;
}

/** Input for ending a call */
export interface EndCallInput {
  resolution: CallResolution;
  durationSeconds?: number;
  transcript?: string;
}

/** List calls filter options */
export interface ListCallsFilters {
  stateCode?: string;
  intent?: string;
  crisisFlag?: boolean;
  limit?: number;
}
