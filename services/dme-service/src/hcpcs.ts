/**
 * HCPCS DMEPOS validator.
 *
 * Each HCPCS code has rules: needs PA, needs Certificate of Medical Necessity,
 * is rental-eligible, monthly cap, etc. Real deployments load this from a
 * DMEPOS jurisdictional fee schedule. We seed a few common items.
 */

export interface DmeRule {
  code: string;
  description: string;
  paAlwaysRequired: boolean;
  cmnRequired: boolean;
  rentalEligible: boolean;
  maxQuantityPerMonth?: number;
}

const RULES: Record<string, DmeRule> = {
  'E0601': { code: 'E0601', description: 'CPAP device',
             paAlwaysRequired: true, cmnRequired: true, rentalEligible: true },
  'E0470': { code: 'E0470', description: 'BiPAP without backup rate',
             paAlwaysRequired: true, cmnRequired: true, rentalEligible: true },
  'E1390': { code: 'E1390', description: 'Oxygen concentrator',
             paAlwaysRequired: true, cmnRequired: true, rentalEligible: true },
  'K0001': { code: 'K0001', description: 'Standard wheelchair',
             paAlwaysRequired: true, cmnRequired: true, rentalEligible: true },
  'A4253': { code: 'A4253', description: 'Blood glucose test strips (per 50)',
             paAlwaysRequired: false, cmnRequired: false, rentalEligible: false,
             maxQuantityPerMonth: 8 },
  'A4259': { code: 'A4259', description: 'Lancets, per 100',
             paAlwaysRequired: false, cmnRequired: false, rentalEligible: false,
             maxQuantityPerMonth: 4 },
};

export interface ValidationResult {
  valid: boolean;
  rule?: DmeRule;
  errors: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// validateHcpcs — spec-compatible lookup helper
// ---------------------------------------------------------------------------

export interface HcpcsValidationResult {
  valid: boolean;
  description?: string;
  requiresPA?: boolean;
  category?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  E0601: 'respiratory',
  E0470: 'respiratory',
  E1390: 'oxygen',
  K0001: 'mobility',
  A4253: 'diabetic_supplies',
  A4259: 'diabetic_supplies',
};

/**
 * Validate a HCPCS code and return description + PA requirement.
 * Returns { valid: false } for unknown codes.
 */
export function validateHcpcs(code: string): HcpcsValidationResult {
  const normalizedCode = code.trim().toUpperCase();
  const rule = RULES[normalizedCode];
  if (!rule) return { valid: false };
  return {
    valid: true,
    description: rule.description,
    requiresPA: rule.paAlwaysRequired,
    category: CATEGORY_MAP[normalizedCode] ?? 'other',
  };
}

export function validate(input: {
  hcpcsCode: string;
  quantity: number;
  rentalOrPurchase: 'rental' | 'purchase';
  cmnComplete: boolean;
  priorAuthId?: string;
}): ValidationResult {
  const rule = RULES[input.hcpcsCode];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rule) {
    warnings.push(`HCPCS code ${input.hcpcsCode} is not in the seed rules table; routing to manual review.`);
    return { valid: true, errors, warnings };
  }

  if (rule.paAlwaysRequired && !input.priorAuthId) {
    errors.push(`${rule.code} (${rule.description}) requires prior authorization.`);
  }
  if (rule.cmnRequired && !input.cmnComplete) {
    errors.push(`${rule.code} requires a Certificate of Medical Necessity.`);
  }
  if (input.rentalOrPurchase === 'rental' && !rule.rentalEligible) {
    errors.push(`${rule.code} is not rental-eligible.`);
  }
  if (rule.maxQuantityPerMonth !== undefined && input.quantity > rule.maxQuantityPerMonth) {
    errors.push(`${rule.code} exceeds monthly cap of ${rule.maxQuantityPerMonth}.`);
  }

  return { valid: errors.length === 0, rule, errors, warnings };
}
