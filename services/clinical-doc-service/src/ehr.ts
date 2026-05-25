/**
 * EHR core module — patient chart access.
 *
 * Scope (this file): problem list, medication list, allergy list, immunizations,
 * vitals, smoking status, labs, imaging, procedures, care plans, patient
 * instructions. CDS firings + MIPS measures live in cds.ts.
 *
 * Behavioral health / home health / school-based extensions in bh.ts, oasis.ts,
 * and iep.ts respectively (scaffold for follow-up).
 *
 * Honest scope note: this is the core schema + read-side service layer. Full
 * ONC 2015 Cures Update certification needs CCDA generation, FHIR R4 patient
 * data access API, Direct messaging, and >50 measure-period CQM calculations
 * — those are deferred.
 *
 * Reference: migrations 0028, 0029.
 */

import { query } from '@medguard360/shared';

// ─── Type definitions ──────────────────────────────────────────────────────
export interface ProblemRow {
  id: string; patient_id: string; icd10_code: string; problem_text: string;
  onset_date: string | null; resolution_date: string | null;
  severity: 'mild'|'moderate'|'severe'|'life_threatening' | null;
  clinical_status: 'active'|'recurrence'|'relapse'|'inactive'|'remission'|'resolved';
  verification_status: string | null;
  notes: string | null;
  created_at: string;
}

export interface MedicationRow {
  id: string; patient_id: string;
  ndc_code: string | null; rxnorm_code: string | null; drug_name: string;
  dosage: string | null; frequency: string | null; route: string | null;
  start_date: string; end_date: string | null;
  status: 'active'|'on_hold'|'completed'|'stopped'|'entered_in_error';
  reason_code: string | null; notes: string | null; created_at: string;
}

export interface AllergyRow {
  id: string; patient_id: string;
  allergen_text: string; allergen_rxnorm: string | null;
  reaction_text: string | null;
  reaction_severity: string | null;
  reaction_type: string | null;
  onset_date: string | null;
  clinical_status: 'active'|'inactive'|'resolved';
  created_at: string;
}

export interface VitalsRow {
  id: string; patient_id: string; encounter_id: string | null; recorded_at: string;
  systolic_bp: number | null; diastolic_bp: number | null;
  heart_rate: number | null; respiratory_rate: number | null;
  temperature_f: number | null;
  height_inches: number | null; weight_lbs: number | null; bmi: number | null;
  o2_saturation_pct: number | null; pain_scale_0_10: number | null;
}

export interface LabRow {
  id: string; patient_id: string;
  loinc_code: string; test_name: string;
  result_value: string | null; result_unit: string | null; reference_range: string | null;
  abnormal_flag: string | null; resulted_at: string;
}

export interface ImagingRow {
  id: string; patient_id: string;
  modality: string; body_region: string; cpt_code: string | null;
  study_date: string; impression: string; critical_finding: boolean;
  status: string;
}

export interface ImmunizationRow {
  id: string; patient_id: string;
  cvx_code: string; vaccine_name: string;
  administered_date: string; lot_number: string | null;
  manufacturer: string | null; vis_version: string | null;
}

export interface CarePlanRow {
  id: string; patient_id: string; condition_icd10: string | null;
  title: string; goals: unknown[]; interventions: unknown[]; barriers: unknown[];
  next_review_date: string | null; status: string;
}

/** Full chart snapshot — returned by GET /clinical-doc/ehr/:patientId */
export interface ChartSnapshot {
  patientId: string;
  problems: ProblemRow[];
  activeProblems: ProblemRow[];
  medications: MedicationRow[];
  activeMedications: MedicationRow[];
  allergies: AllergyRow[];
  activeAllergies: AllergyRow[];
  immunizations: ImmunizationRow[];
  latestVitals: VitalsRow | null;
  vitalsHistory: VitalsRow[];
  labs: LabRow[];
  criticalLabs: LabRow[];
  imaging: ImagingRow[];
  carePlans: CarePlanRow[];
  smokingStatus: { status: string; recorded_at: string; cessation_counseling_provided: boolean } | null;
}

// ─── Read functions ─────────────────────────────────────────────────────────

export async function getChart(patientId: string): Promise<ChartSnapshot> {
  const [probs, meds, alls, imms, vits, labs, imgs, cps, smk] = await Promise.all([
    query<ProblemRow>('ehr.problems',
      `SELECT * FROM ehr_problems WHERE patient_id = $1 ORDER BY clinical_status, onset_date DESC LIMIT 200`, [patientId]),
    query<MedicationRow>('ehr.meds',
      `SELECT * FROM ehr_medications WHERE patient_id = $1 ORDER BY status, start_date DESC LIMIT 200`, [patientId]),
    query<AllergyRow>('ehr.allergies',
      `SELECT * FROM ehr_allergies WHERE patient_id = $1 ORDER BY clinical_status, reaction_severity NULLS LAST LIMIT 100`, [patientId]),
    query<ImmunizationRow>('ehr.imms',
      `SELECT * FROM ehr_immunizations WHERE patient_id = $1 ORDER BY administered_date DESC LIMIT 100`, [patientId]),
    query<VitalsRow>('ehr.vitals',
      `SELECT * FROM ehr_vitals WHERE patient_id = $1 ORDER BY recorded_at DESC LIMIT 50`, [patientId]),
    query<LabRow>('ehr.labs',
      `SELECT * FROM ehr_lab_results WHERE patient_id = $1 ORDER BY resulted_at DESC LIMIT 100`, [patientId]),
    query<ImagingRow>('ehr.imaging',
      `SELECT * FROM ehr_imaging_results WHERE patient_id = $1 ORDER BY study_date DESC LIMIT 50`, [patientId]),
    query<CarePlanRow>('ehr.careplans',
      `SELECT * FROM ehr_care_plans WHERE patient_id = $1 AND status IN ('active','draft','on_hold') ORDER BY next_review_date NULLS LAST LIMIT 20`, [patientId]),
    query<{ status: string; recorded_at: string; cessation_counseling_provided: boolean }>('ehr.smoking',
      `SELECT status, recorded_at, cessation_counseling_provided FROM ehr_smoking_status WHERE patient_id = $1 ORDER BY recorded_at DESC LIMIT 1`, [patientId]),
  ]);
  return {
    patientId,
    problems: probs.rows, activeProblems: probs.rows.filter(p => p.clinical_status === 'active'),
    medications: meds.rows, activeMedications: meds.rows.filter(m => m.status === 'active'),
    allergies: alls.rows,   activeAllergies:   alls.rows.filter(a => a.clinical_status === 'active'),
    immunizations: imms.rows,
    latestVitals: vits.rows[0] ?? null, vitalsHistory: vits.rows,
    labs: labs.rows,         criticalLabs: labs.rows.filter(l => l.abnormal_flag === 'critical_low' || l.abnormal_flag === 'critical_high'),
    imaging: imgs.rows,
    carePlans: cps.rows,
    smokingStatus: smk.rows[0] ?? null,
  };
}

// ─── Write functions ────────────────────────────────────────────────────────

export async function addProblem(input: {
  patientId: string; stateCode: string;
  icd10Code: string; problemText: string;
  onsetDate?: string; severity?: ProblemRow['severity'];
  clinicalStatus?: ProblemRow['clinical_status'];
  recordedBy: string; notes?: string;
}): Promise<ProblemRow> {
  const r = await query<ProblemRow>('ehr.addProblem',
    `INSERT INTO ehr_problems (patient_id, state_code, icd10_code, problem_text,
        onset_date, severity, clinical_status, recorded_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [input.patientId, input.stateCode, input.icd10Code, input.problemText,
      input.onsetDate ?? null, input.severity ?? null, input.clinicalStatus ?? 'active',
      input.recordedBy, input.notes ?? null]);
  return r.rows[0];
}

export async function addMedication(input: {
  patientId: string; stateCode: string;
  ndcCode?: string; rxnormCode?: string; drugName: string;
  dosage?: string; frequency?: string; route?: string;
  prescriberUserId?: string; startDate?: string; endDate?: string;
  reasonCode?: string; notes?: string;
}): Promise<MedicationRow> {
  const r = await query<MedicationRow>('ehr.addMed',
    `INSERT INTO ehr_medications (patient_id, state_code, ndc_code, rxnorm_code, drug_name,
        dosage, frequency, route, prescriber_user_id, start_date, end_date, reason_code, notes)
     VALUES ($1,$2,$3,$4,$5, $6,$7,$8, $9, COALESCE($10::date, CURRENT_DATE), $11, $12, $13) RETURNING *`,
    [input.patientId, input.stateCode, input.ndcCode ?? null, input.rxnormCode ?? null, input.drugName,
      input.dosage ?? null, input.frequency ?? null, input.route ?? null,
      input.prescriberUserId ?? null, input.startDate ?? null, input.endDate ?? null,
      input.reasonCode ?? null, input.notes ?? null]);
  return r.rows[0];
}

export async function addAllergy(input: {
  patientId: string; stateCode: string;
  allergenText: string; allergenRxnorm?: string;
  reactionText?: string;
  reactionSeverity?: 'mild'|'moderate'|'severe'|'life_threatening';
  reactionType?: 'allergy'|'intolerance'|'side_effect'|'unknown';
  onsetDate?: string;
  recordedBy: string;
}): Promise<AllergyRow> {
  const r = await query<AllergyRow>('ehr.addAllergy',
    `INSERT INTO ehr_allergies (patient_id, state_code, allergen_text, allergen_rxnorm,
        reaction_text, reaction_severity, reaction_type, onset_date, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [input.patientId, input.stateCode, input.allergenText, input.allergenRxnorm ?? null,
      input.reactionText ?? null, input.reactionSeverity ?? null, input.reactionType ?? null,
      input.onsetDate ?? null, input.recordedBy]);
  return r.rows[0];
}

export async function addVitals(input: {
  patientId: string; encounterId?: string; stateCode: string;
  systolicBp?: number; diastolicBp?: number;
  heartRate?: number; respiratoryRate?: number;
  temperatureF?: number; heightInches?: number; weightLbs?: number;
  o2SaturationPct?: number; painScale0_10?: number;
  recordedBy: string;
}): Promise<VitalsRow> {
  const bmi = input.heightInches && input.weightLbs
    ? Number(((input.weightLbs / (input.heightInches * input.heightInches)) * 703).toFixed(1))
    : null;
  const r = await query<VitalsRow>('ehr.addVitals',
    `INSERT INTO ehr_vitals (patient_id, encounter_id, state_code,
        systolic_bp, diastolic_bp, heart_rate, respiratory_rate, temperature_f,
        height_inches, weight_lbs, bmi, o2_saturation_pct, pain_scale_0_10, recorded_by)
     VALUES ($1,$2,$3, $4,$5,$6,$7,$8, $9,$10,$11, $12,$13, $14) RETURNING *`,
    [input.patientId, input.encounterId ?? null, input.stateCode,
      input.systolicBp ?? null, input.diastolicBp ?? null,
      input.heartRate ?? null, input.respiratoryRate ?? null, input.temperatureF ?? null,
      input.heightInches ?? null, input.weightLbs ?? null, bmi,
      input.o2SaturationPct ?? null, input.painScale0_10 ?? null, input.recordedBy]);
  return r.rows[0];
}

export async function addImmunization(input: {
  patientId: string; stateCode: string;
  cvxCode: string; vaccineName: string;
  administeredDate: string; lotNumber?: string;
  manufacturer?: string; visVersion?: string; administeredBy?: string;
}): Promise<ImmunizationRow> {
  const r = await query<ImmunizationRow>('ehr.addImmunization',
    `INSERT INTO ehr_immunizations (patient_id, state_code, cvx_code, vaccine_name,
        administered_date, lot_number, manufacturer, vis_version, administered_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [input.patientId, input.stateCode, input.cvxCode, input.vaccineName,
      input.administeredDate, input.lotNumber ?? null, input.manufacturer ?? null,
      input.visVersion ?? null, input.administeredBy ?? null]);
  return r.rows[0];
}
