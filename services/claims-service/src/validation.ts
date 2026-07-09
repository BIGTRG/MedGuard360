import { z } from 'zod';

export const ClaimLineSchema = z.object({
  line_number: z.number().int().positive(),
  procedure_code: z.string().min(1).max(20),
  modifier_codes: z.array(z.string().length(2)).max(4).optional(),
  diagnosis_pointers: z.array(z.number().int().min(1).max(12)).optional(),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  units: z.number().positive(),
  unit_type: z.string().optional(),
  charge_amount: z.number().nonnegative(),
  place_of_service: z.string().length(2).optional(),
});

export const CreateClaimSchema = z.object({
  encounter_id: z.string().uuid().optional(),
  patient_id: z.string().uuid(),
  payer_id: z.string().min(1),
  claim_type: z.string().min(1),
  state_code: z.string().length(2),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_amount: z.number().nonnegative(),
  lines: z.array(ClaimLineSchema).min(1).max(50),
});

export const UpdateStatusSchema = z.object({
  status: z.string().min(1),
  fraud_score: z.number().min(0).max(100).optional(),
  paid_at: z.string().datetime().optional(),
});
