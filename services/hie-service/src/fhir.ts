/**
 * FHIR R4 resource builders for the hie-service gateway.
 *
 * Produces structurally-valid FHIR R4 JSON. MedGuard360 is a gateway, not
 * a full FHIR server — these builders translate local domain objects into
 * FHIR wire format for inbound/outbound HIE traffic.
 *
 * References:
 *   https://www.hl7.org/fhir/R4/
 *   CMS Interoperability and Prior Authorization Final Rule (CMS-0057-F)
 */

// ---------------------------------------------------------------------------
// buildFhirPatient
// ---------------------------------------------------------------------------

export interface FhirPatientInput {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;          // YYYY-MM-DD
  medicaidId: string;
  stateCode: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  phone?: string;
  email?: string;
}

/**
 * Build a FHIR R4 Patient resource from local patient data.
 */
export function buildFhirPatient(patient: FhirPatientInput): Record<string, unknown> {
  return {
    resourceType: 'Patient',
    id: patient.id,
    meta: {
      profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient'],
    },
    identifier: [
      {
        use: 'official',
        system: `urn:oid:2.16.840.1.113883.4.642.4.1.${patient.stateCode}`,
        value: patient.medicaidId,
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'MA',
              display: 'Medicaid Number',
            },
          ],
        },
      },
    ],
    name: [
      {
        use: 'official',
        family: patient.lastName,
        given: [patient.firstName],
      },
    ],
    gender: patient.gender ?? 'unknown',
    birthDate: patient.dob,
    address: [
      {
        state: patient.stateCode,
      },
    ],
    telecom: [
      ...(patient.phone
        ? [{ system: 'phone', value: patient.phone, use: 'home' }]
        : []),
      ...(patient.email
        ? [{ system: 'email', value: patient.email }]
        : []),
    ],
  };
}

// ---------------------------------------------------------------------------
// buildFhirServiceRequest
// ---------------------------------------------------------------------------

export interface FhirServiceRequestInput {
  referralId: string;
  patientId: string;
  reason: string;
  priority: 'stat' | 'urgent' | 'routine' | 'elective';
  requesterId: string;
  requesterNpi?: string;
  toProviderId?: string;
  notes?: string;
}

/**
 * Build a FHIR R4 ServiceRequest resource for a referral.
 * Maps to the referrals table + hie_referral domain object.
 */
export function buildFhirServiceRequest(
  params: FhirServiceRequestInput,
): Record<string, unknown> {
  // FHIR priority: 'elective' maps to 'routine' in the FHIR spec enum
  const fhirPriority =
    params.priority === 'elective' ? 'routine' : params.priority;

  return {
    resourceType: 'ServiceRequest',
    id: params.referralId,
    meta: {
      profile: [
        'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-servicerequest',
      ],
    },
    status: 'active',
    intent: 'order',
    priority: fhirPriority,
    subject: {
      reference: `Patient/${params.patientId}`,
    },
    requester: {
      reference: `Practitioner/${params.requesterId}`,
      ...(params.requesterNpi
        ? {
            identifier: {
              system: 'http://hl7.org/fhir/sid/us-npi',
              value: params.requesterNpi,
            },
          }
        : {}),
    },
    ...(params.toProviderId
      ? { performer: [{ reference: `Practitioner/${params.toProviderId}` }] }
      : {}),
    reasonCode: [{ text: params.reason }],
    note: params.notes ? [{ text: params.notes }] : [],
    authoredOn: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// parseFhirBundle
// ---------------------------------------------------------------------------

/**
 * Parse a FHIR R4 Bundle from an external HIE response.
 *
 * In production this validates bundle.resourceType === 'Bundle' and iterates
 * bundle.entry[].resource. For stub/dev it returns mock data when the bundle
 * is not a real FHIR bundle.
 */
export function parseFhirBundle(
  bundle: Record<string, unknown>,
): Array<{ resourceType: string; id: string; data: Record<string, unknown> }> {
  // Real FHIR bundle parsing
  if (bundle.resourceType === 'Bundle' && Array.isArray(bundle.entry)) {
    const entries = bundle.entry as Array<{
      resource?: Record<string, unknown>;
    }>;
    return entries
      .filter((e) => e.resource && e.resource.id)
      .map((e) => ({
        resourceType: (e.resource!.resourceType as string) ?? 'Unknown',
        id: e.resource!.id as string,
        data: e.resource!,
      }));
  }

  // Stub: return mock data for dev/testing when no real bundle is provided
  return [
    {
      resourceType: 'Patient',
      id: 'stub-patient-001',
      data: {
        resourceType: 'Patient',
        id: 'stub-patient-001',
        name: [{ family: 'Doe', given: ['Jane'] }],
        gender: 'female',
        birthDate: '1980-01-01',
        _stub: true,
      },
    },
    {
      resourceType: 'Condition',
      id: 'stub-condition-001',
      data: {
        resourceType: 'Condition',
        id: 'stub-condition-001',
        subject: { reference: 'Patient/stub-patient-001' },
        code: { text: 'Hypertension' },
        _stub: true,
      },
    },
  ];
}
