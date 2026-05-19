/**
 * Minimal NCPDP D.0 claim payload generator.
 *
 * NCPDP Telecom D.0 is a fixed-position + delimited format. We generate
 * a faithful approximation suitable for development/testing. Production
 * wiring runs through a clearinghouse or direct payer NCPDP gateway.
 *
 * Field separator: 0x1C  ⟶ rendered here as the pipe `|` for legibility
 * Group separator: 0x1D  ⟶ rendered as `||`
 * Segment separator: 0x1E ⟶ rendered as `\n`
 */

export interface NcpdpPharmacyClaimInput {
  bin: string;                  // payer routing
  pcn: string;                  // processor control number
  groupId?: string;
  cardholderId: string;         // patient member id
  patientFirstName: string;
  patientLastName: string;
  patientDateOfBirth: string;   // YYYYMMDD
  prescriberNpi: string;
  pharmacyNpi: string;
  ndc: string;                  // 11-digit
  quantityDispensed: string;    // numeric as string for fixed-point precision
  daysSupply: number;
  refillNumber: number;
  dateOfService: string;        // YYYYMMDD
  grossAmountDueCents: number;
}

const PIPE = '|';
const GS = '||';

function f(tag: string, value: string | number): string {
  return `${tag}=${value}`;
}

export function buildNcpdpClaim(input: NcpdpPharmacyClaimInput): string {
  const header = [
    f('BIN', input.bin),
    f('TX', 'B1'),                      // billing transaction code
    f('VER', 'D0'),
    f('PCN', input.pcn),
    input.groupId ? f('GRP', input.groupId) : null,
  ].filter(Boolean).join(PIPE);

  const insurance = [
    f('AM01', '01'),                    // segment id: Insurance
    f('CARDHOLDER_ID', input.cardholderId),
    f('PERSON_CODE', '001'),
  ].join(PIPE);

  const patient = [
    f('AM02', '01'),
    f('DOB', input.patientDateOfBirth),
    f('LAST', input.patientLastName),
    f('FIRST', input.patientFirstName),
  ].join(PIPE);

  const claim = [
    f('AM07', '01'),
    f('NDC', input.ndc),
    f('QTY', input.quantityDispensed),
    f('DS', String(input.daysSupply)),
    f('RX_REFILL', String(input.refillNumber)),
    f('DOS', input.dateOfService),
  ].join(PIPE);

  const pharmacy = [
    f('AM03', '01'),
    f('NPI', input.pharmacyNpi),
    f('PRESCRIBER_NPI', input.prescriberNpi),
  ].join(PIPE);

  const pricing = [
    f('AM11', '01'),
    f('GROSS_CENTS', String(input.grossAmountDueCents)),
  ].join(PIPE);

  return [header, insurance, patient, pharmacy, claim, pricing].join(`\n${GS}\n`);
}

// ---------------------------------------------------------------------------
// generateNcpdpD0 — spec-compatible wrapper around buildNcpdpClaim
// ---------------------------------------------------------------------------

export interface GenerateNcpdpD0Params {
  ndc: string;
  quantity: number;
  daysSupply: number;
  fillDate: string;
  patientMedicaidId: string;
  pharmacyNpi: string;
  payerId: string;
  totalAmount: number;
  priorAuthNumber?: string;
}

/**
 * Returns a formatted NCPDP D.0 string (pipe-delimited fields).
 * Format: HDR|...\n||...\n|| (segments separated by group-separator).
 *
 * Thin adapter over buildNcpdpClaim that accepts the simpler param set
 * required by the service spec.
 */
export function generateNcpdpD0(params: GenerateNcpdpD0Params): string {
  const dos = params.fillDate.replace(/-/g, '');
  return buildNcpdpClaim({
    bin: params.payerId.slice(0, 6).padEnd(6, '0'),
    pcn: 'MG360',
    cardholderId: params.patientMedicaidId,
    patientFirstName: 'PATIENT',
    patientLastName: 'MEDICAID',
    patientDateOfBirth: '19000101',     // not available in simplified params
    prescriberNpi: '0000000000',        // not available in simplified params
    pharmacyNpi: params.pharmacyNpi,
    ndc: params.ndc,
    quantityDispensed: params.quantity.toFixed(3),
    daysSupply: params.daysSupply,
    refillNumber: 0,
    dateOfService: dos,
    grossAmountDueCents: Math.round(params.totalAmount * 100),
  });
}

/** Quick adjudication-style validation. Returns null when valid, NCPDP reject code on issue. */
export function validateClaim(input: NcpdpPharmacyClaimInput): { code: string; message: string } | null {
  if (!/^\d{11}$/.test(input.ndc)) return { code: '21', message: 'Missing or invalid NDC' };
  if (input.daysSupply <= 0)         return { code: 'M/I', message: 'Days supply must be > 0' };
  if (Number.parseFloat(input.quantityDispensed) <= 0) return { code: 'M/I', message: 'Quantity must be > 0' };
  if (!/^\d{10}$/.test(input.prescriberNpi))           return { code: '42', message: 'Invalid prescriber NPI' };
  if (!/^\d{10}$/.test(input.pharmacyNpi))             return { code: '42', message: 'Invalid pharmacy NPI' };
  if (input.grossAmountDueCents < 0)                    return { code: 'M/I', message: 'Negative charge' };
  return null;
}
