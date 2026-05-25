/**
 * Surescripts adapter — e-prescribing + medication history.
 *
 * Surescripts is the dominant US e-prescribing network (NCPDP SCRIPT v2017071).
 * Used by pharmacy-service to route refill requests + by provider EHR for new Rx.
 *
 * Onboarding: Surescripts vendor certification (~$25K), HIPAA BAA, NPI of
 * software, IIS-style provider attestation.
 *
 * IG: https://www.surescripts.com/network-connections/specifications
 */

import { getConfigOptional, logger } from '../..';

export interface NewRxRequest {
  prescriberNpi: string;
  pharmacyNcpdpId: string;
  patient: { firstName: string; lastName: string; dob: string; gender: 'M' | 'F' | 'U' };
  medication: { ndc: string; drugName: string; quantity: number; daysSupply: number; refills: number; sig: string };
  notes?: string;
}

export interface NewRxResponse {
  messageId: string;
  status: 'accepted' | 'rejected';
  errors?: string[];
}

export interface MedicationHistoryRequest {
  patient: { firstName: string; lastName: string; dob: string; ssn4?: string };
  monthsBack: number;
}

export interface MedicationHistoryEntry {
  ndc: string;
  drugName: string;
  fillDate: string;
  pharmacy: string;
  prescriberName: string;
  daysSupply: number;
  quantity: number;
}

export interface SurescriptsAdapter {
  sendNewRx(req: NewRxRequest): Promise<NewRxResponse>;
  getMedicationHistory(req: MedicationHistoryRequest): Promise<MedicationHistoryEntry[]>;
}

class StubSurescripts implements SurescriptsAdapter {
  async sendNewRx(req: NewRxRequest): Promise<NewRxResponse> {
    logger.info('surescripts-stub NewRx', { drug: req.medication.drugName, ncpdp: req.pharmacyNcpdpId });
    return { messageId: `srx-stub-${Date.now()}`, status: 'accepted' };
  }
  async getMedicationHistory(req: MedicationHistoryRequest): Promise<MedicationHistoryEntry[]> {
    logger.info('surescripts-stub med history', { patient: req.patient.lastName });
    return [{
      ndc: '00378-1810-93', drugName: 'Lisinopril 20 mg tab',
      fillDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
      pharmacy: 'Maple Street Pharmacy', prescriberName: 'Dr. Alice Johnson MD',
      daysSupply: 30, quantity: 30,
    }];
  }
}

let _instance: SurescriptsAdapter | undefined;
export function getSurescriptsAdapter(): SurescriptsAdapter {
  if (!_instance) {
    const mode = getConfigOptional('SURESCRIPTS_MODE', 'stub');
    if (mode === 'live') throw new Error('SURESCRIPTS_MODE=live not yet implemented');
    _instance = new StubSurescripts();
  }
  return _instance;
}

export const SURESCRIPTS_REQUIRED_ENV = [
  'SURESCRIPTS_MODE',
  'SURESCRIPTS_VENDOR_ID',
  'SURESCRIPTS_API_BASE',
  'SURESCRIPTS_CLIENT_CERT_PATH',
  'SURESCRIPTS_CLIENT_KEY_PATH',
] as const;
