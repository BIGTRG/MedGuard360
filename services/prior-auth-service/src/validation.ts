import { z } from 'zod';

export type CriterionOutcome = 'met' | 'not_met' | 'indeterminate';

/**
 * Investigators send 'unclear' from the UI; the canonical DB value is
 * 'indeterminate'. Normalize at the API boundary so the DB never sees
 * 'unclear'.
 */
export const CriterionOverrideSchema = z.object({
  outcome: z.enum(['met', 'not_met', 'unclear', 'indeterminate']),
}).transform((value): { outcome: CriterionOutcome } => ({
  outcome: value.outcome === 'unclear' ? 'indeterminate' : value.outcome,
}));

export type CriterionOverrideInput = z.infer<typeof CriterionOverrideSchema>;
