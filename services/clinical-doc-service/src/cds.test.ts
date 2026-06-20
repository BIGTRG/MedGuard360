import { evaluateRules, CdsRule } from './cds';
import { ChartSnapshot } from './ehr';

const emptyChart = (): ChartSnapshot => ({
  patientId: '10000000-0000-0000-0000-000000000001',
  problems: [],
  activeProblems: [],
  medications: [],
  activeMedications: [],
  allergies: [],
  activeAllergies: [],
  immunizations: [],
  latestVitals: null,
  vitalsHistory: [],
  labs: [],
  criticalLabs: [],
  imaging: [],
  carePlans: [],
  smokingStatus: null,
});

describe('evaluateRules', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires drug_allergy when active med name contains allergen text', () => {
    const chart = emptyChart();
    chart.activeMedications = [{
      id: 'm1', patient_id: chart.patientId, ndc_code: null, rxnorm_code: null,
      drug_name: 'Penicillin VK 500mg', dosage: null, frequency: null, route: null,
      start_date: '2026-05-01', end_date: null, status: 'active',
      reason_code: null, notes: null, created_at: '2026-05-01',
    }];
    chart.activeAllergies = [{
      id: 'a1', patient_id: chart.patientId, allergen_text: 'Penicillin',
      allergen_rxnorm: null, reaction_text: 'Rash', reaction_severity: 'moderate',
      reaction_type: null, onset_date: null, clinical_status: 'active', created_at: '2026-01-01',
    }];
    const rules: CdsRule[] = [{
      id: 'r1', rule_key: 'drug_allergy', category: 'drug_allergy', severity: 'critical',
      rule_text: 'Allergy conflict', trigger_logic: {}, source_citation: null, active: true,
    }];
    const firings = evaluateRules(chart, rules);
    expect(firings.length).toBe(1);
    expect(firings[0].reason).toContain('Penicillin');
  });

  it('fires high_risk_med when required lab is missing', () => {
    const chart = emptyChart();
    chart.activeMedications = [{
      id: 'm2', patient_id: chart.patientId, ndc_code: null, rxnorm_code: null,
      drug_name: 'Warfarin 5mg', dosage: null, frequency: null, route: null,
      start_date: '2026-05-01', end_date: null, status: 'active',
      reason_code: null, notes: null, created_at: '2026-05-01',
    }];
    const rules: CdsRule[] = [{
      id: 'r2', rule_key: 'warfarin_inr', category: 'high_risk_med', severity: 'warning',
      rule_text: 'INR monitoring', trigger_logic: {
        medication_active: 'warfarin', missing_lab: '6301-6', window_days: 30,
      }, source_citation: null, active: true,
    }];
    const firings = evaluateRules(chart, rules);
    expect(firings.length).toBe(1);
    expect(firings[0].reason).toContain('6301-6');
  });

  it('fires preventive when immunization is overdue', () => {
    const chart = emptyChart();
    chart.immunizations = [{
      id: 'i1', patient_id: chart.patientId, cvx_code: '140',
      vaccine_name: 'Influenza', administered_date: '2024-10-01',
      lot_number: null, manufacturer: null, vis_version: null,
    }];
    const rules: CdsRule[] = [{
      id: 'r3', rule_key: 'flu_vax', category: 'preventive', severity: 'info',
      rule_text: 'Annual flu vaccine', trigger_logic: { cvx: '140', window_days: 365 },
      source_citation: 'ACIP', active: true,
    }];
    const firings = evaluateRules(chart, rules);
    expect(firings.length).toBe(1);
    expect(firings[0].reason).toContain('140');
  });
});