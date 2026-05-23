/**
 * DMEPOS Medicare Administrative Contractor (DME MAC) routing.
 *
 * The DME MAC determines which contractor adjudicates Medicare DMEPOS claims
 * for the patient's state of residence. Per CMS DME MAC jurisdiction map:
 *
 *   Jurisdiction A — Noridian Healthcare Solutions   (Northeast)
 *   Jurisdiction B — CGS Administrators (legacy)     (Midwest)  -- consolidated into JC in 2024
 *   Jurisdiction C — CGS Administrators              (Southeast: NC, SC, GA, FL, TN, AL, AR, CO, LA, MS, NM, OK, PR, TX, VI, VA, WV)
 *   Jurisdiction D — Noridian Healthcare Solutions   (West)
 *
 * Reference: integrations/nc-enterprise/README.md — confirmed CGS JC for NC,
 *  not Noridian as commonly mis-cited.
 */

export type DmeMacJurisdiction = 'A' | 'C' | 'D';

export interface DmeMacRoute {
  jurisdiction: DmeMacJurisdiction;
  contractor: string;
  edi_payer_id: string;
  contact_url: string;
}

const STATE_TO_DMEMAC: Record<string, DmeMacJurisdiction> = {
  // Jurisdiction A — Noridian Northeast
  CT: 'A', DE: 'A', DC: 'A', ME: 'A', MD: 'A', MA: 'A', NH: 'A', NJ: 'A',
  NY: 'A', PA: 'A', RI: 'A', VT: 'A',
  // Jurisdiction C — CGS Southeast (Phase-1 pilot states sit here)
  NC: 'C', SC: 'C', GA: 'C', FL: 'C', TN: 'C', AL: 'C', AR: 'C', CO: 'C',
  LA: 'C', MS: 'C', NM: 'C', OK: 'C', TX: 'C', VA: 'C', WV: 'C',
  // Jurisdiction D — Noridian West (rest of states default-routed here)
};

const MACS: Record<DmeMacJurisdiction, DmeMacRoute> = {
  A: {
    jurisdiction: 'A',
    contractor:   'Noridian Healthcare Solutions',
    edi_payer_id: 'NORIDIAN_JA',
    contact_url:  'https://med.noridianmedicare.com/web/jadme',
  },
  C: {
    jurisdiction: 'C',
    contractor:   'CGS Administrators',
    edi_payer_id: 'CGS_JC',
    contact_url:  'https://www.cgsmedicare.com/jc/',
  },
  D: {
    jurisdiction: 'D',
    contractor:   'Noridian Healthcare Solutions',
    edi_payer_id: 'NORIDIAN_JD',
    contact_url:  'https://med.noridianmedicare.com/web/jddme',
  },
};

/** Resolve the DME MAC route for a Medicare DMEPOS claim. */
export function resolveDmeMac(stateCode: string): DmeMacRoute {
  const j = STATE_TO_DMEMAC[stateCode.toUpperCase()] ?? 'D';
  return MACS[j];
}
