/**
 * Da Vinci PAS FHIR R4 Bundle builder.
 *
 * Constructs a PAS-conformant Bundle to submit to a payer's PA endpoint per
 * the HL7 Da Vinci Prior Authorization Support IG (STU 2.0).
 *
 * IG: http://hl7.org/fhir/us/davinci-pas/STU2/
 *
 * Bundle structure for a 278 Submit:
 *   Bundle (type: collection, identifier: PA reference number)
 *     ├ Claim (subType: code 'professional', use: 'preauthorization')
 *     │  ├ patient → reference Patient
 *     │  ├ provider → reference Organization (billing)
 *     │  ├ careTeam[] → reference Practitioner (rendering, attending)
 *     │  ├ diagnosis[] → ICD-10-CM codes
 *     │  ├ insurance → Coverage
 *     │  └ item[] → service codes (CPT/HCPCS) + serviceDate
 *     ├ Patient
 *     ├ Organization (billing provider)
 *     ├ Practitioner (rendering)
 *     ├ Coverage (payer + member ID)
 *     └ DocumentReference[] (supporting clinical notes)
 */

export interface PasBundleInput {
  paReferenceNumber: string;
  patient: { id: string; medicaidId: string; firstName: string; lastName: string; dob: string; gender: 'male' | 'female' | 'other' | 'unknown' };
  billingProvider: { id: string; npi: string; name: string };
  renderingProvider?: { id: string; npi: string; name: string };
  payer: { id: string; name: string };
  diagnoses: { icd10: string; description?: string }[];
  service: { code: string; codeType: 'CPT' | 'HCPCS' | 'NDC'; description?: string; quantity?: number; serviceDate: string };
  clinicalNotes?: { url: string; contentType: string; title?: string }[];
}

/** Build a PAS-compliant Bundle for a 278 Submit transaction. */
export function buildPasSubmitBundle(input: PasBundleInput): Record<string, unknown> {
  const patientRef = `Patient/${input.patient.id}`;
  const billingRef = `Organization/${input.billingProvider.id}`;
  const renderingRef = input.renderingProvider ? `Practitioner/${input.renderingProvider.id}` : undefined;
  const coverageRef = `Coverage/${input.payer.id}-${input.patient.medicaidId}`;

  return {
    resourceType: 'Bundle',
    id: `pa-submit-${input.paReferenceNumber}`,
    meta: { profile: ['http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-pas-request-bundle'] },
    type: 'collection',
    identifier: { system: 'urn:medguard360:pa', value: input.paReferenceNumber },
    timestamp: new Date().toISOString(),
    entry: [
      // Claim resource — the heart of a 278 Submit
      {
        fullUrl: `urn:uuid:claim-${input.paReferenceNumber}`,
        resource: {
          resourceType: 'Claim',
          meta: { profile: ['http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-claim'] },
          status: 'active',
          type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/claim-type', code: 'professional' }] },
          use: 'preauthorization',
          patient: { reference: patientRef },
          created: new Date().toISOString(),
          provider: { reference: billingRef },
          priority: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/processpriority', code: 'normal' }] },
          insurance: [{ sequence: 1, focal: true, coverage: { reference: coverageRef } }],
          diagnosis: input.diagnoses.map((d, i) => ({
            sequence: i + 1,
            diagnosisCodeableConcept: {
              coding: [{ system: 'http://hl7.org/fhir/sid/icd-10-cm', code: d.icd10, display: d.description }],
            },
          })),
          item: [{
            sequence: 1,
            productOrService: {
              coding: [{
                system: input.service.codeType === 'CPT' ? 'http://www.ama-assn.org/go/cpt'
                       : input.service.codeType === 'HCPCS' ? 'https://bluebutton.cms.gov/resources/codesystem/hcpcs'
                       : 'http://hl7.org/fhir/sid/ndc',
                code: input.service.code,
                display: input.service.description,
              }],
            },
            servicedDate: input.service.serviceDate,
            quantity: input.service.quantity ? { value: input.service.quantity } : undefined,
            careTeamSequence: renderingRef ? [1] : undefined,
          }],
          careTeam: renderingRef ? [{ sequence: 1, provider: { reference: renderingRef }, role: { coding: [{ code: 'rendering' }] } }] : undefined,
          supportingInfo: input.clinicalNotes?.map((note, i) => ({
            sequence: i + 1,
            category: { coding: [{ system: 'http://hl7.org/fhir/us/davinci-pas/CodeSystem/PASSupportingInfoType', code: 'patientEvent' }] },
            valueReference: { reference: `DocumentReference/note-${i + 1}` },
          })),
        },
      },
      // Patient
      {
        fullUrl: `urn:uuid:${patientRef}`,
        resource: {
          resourceType: 'Patient',
          id: input.patient.id,
          identifier: [{ system: 'http://hl7.org/fhir/sid/us-medicaid', value: input.patient.medicaidId }],
          name: [{ family: input.patient.lastName, given: [input.patient.firstName] }],
          gender: input.patient.gender,
          birthDate: input.patient.dob,
        },
      },
      // Billing Organization
      {
        fullUrl: `urn:uuid:${billingRef}`,
        resource: {
          resourceType: 'Organization',
          id: input.billingProvider.id,
          identifier: [{ system: 'http://hl7.org/fhir/sid/us-npi', value: input.billingProvider.npi }],
          name: input.billingProvider.name,
        },
      },
      // Rendering Practitioner (optional)
      ...(input.renderingProvider ? [{
        fullUrl: `urn:uuid:${renderingRef}`,
        resource: {
          resourceType: 'Practitioner',
          id: input.renderingProvider.id,
          identifier: [{ system: 'http://hl7.org/fhir/sid/us-npi', value: input.renderingProvider.npi }],
          name: [{ family: input.renderingProvider.name }],
        },
      }] : []),
      // Coverage
      {
        fullUrl: `urn:uuid:${coverageRef}`,
        resource: {
          resourceType: 'Coverage',
          id: `${input.payer.id}-${input.patient.medicaidId}`,
          status: 'active',
          beneficiary: { reference: patientRef },
          payor: [{ display: input.payer.name }],
          identifier: [{ system: `urn:medguard360:payer:${input.payer.id}`, value: input.patient.medicaidId }],
        },
      },
      // DocumentReferences for supporting clinical notes
      ...((input.clinicalNotes ?? []).map((note, i) => ({
        fullUrl: `urn:uuid:DocumentReference/note-${i + 1}`,
        resource: {
          resourceType: 'DocumentReference',
          id: `note-${i + 1}`,
          status: 'current',
          subject: { reference: patientRef },
          content: [{ attachment: { url: note.url, contentType: note.contentType, title: note.title } }],
        },
      }))),
    ],
  };
}
