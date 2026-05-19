export type DenialStatus = 'received' | 'reviewing' | 'appealing' | 'appeal_won' | 'appeal_lost' | 'write_off' | 'expired';
export type AppealStatus = 'draft' | 'submitted' | 'won' | 'lost' | 'withdrawn';

export interface DenialRow {
  id: string;
  claim_id: string;
  state_code: string;
  carc_code: string;
  carc_description: string;
  rarc_codes: string[];
  denied_amount_cents: string;
  remit_received_at: Date;
  payer_message: string | null;
  status: DenialStatus;
  appeal_deadline: Date | null;
  assigned_specialist: string | null;
}

export interface AppealRow {
  id: string;
  denial_id: string;
  attempt_number: number;
  status: AppealStatus;
  drafted_by_ai: boolean;
  ai_engine_version: string | null;
  ai_confidence: string | null;
  subject: string;
  body: string;
  attachments: string[];
  reviewed_by: string | null;
  reviewed_at: Date | null;
  submitted_at: Date | null;
  decision_at: Date | null;
  decision_notes: string | null;
}
