import { z } from 'zod';

export const CreatePatientSchema = z.object({
  medicaid_id:    z.string().min(1).max(50),
  medicare_id:    z.string().max(50).nullable().optional(),
  first_name:     z.string().min(1).max(100),
  last_name:      z.string().min(1).max(100),
  dob:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dob must be YYYY-MM-DD'),
  state_code:     z.string().length(2),
  payer_id:       z.string().max(50).nullable().optional(),
  mco_id:         z.string().uuid().nullable().optional(),
  biometric_hash: z.string().max(256).nullable().optional(),
  is_active:      z.boolean().optional().default(true),
});

export function serializePatient(row: Record<string, unknown>): Record<string, unknown> {
  const dob = row['date_of_birth'] ?? row['dob'];
  return {
    id: row['id'],
    patient_id: row['id'],
    first_name: row['first_name'],
    last_name: row['last_name'],
    date_of_birth: dob instanceof Date ? dob.toISOString().slice(0, 10) : dob,
    medicaid_id: row['medicaid_id'] ?? null,
    state_code: row['state_code'],
    email: row['email'] ?? null,
    phone: row['phone'] ?? null,
  };
}