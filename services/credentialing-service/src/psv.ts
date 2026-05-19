/**
 * Primary Source Verification (PSV).
 *
 * Real deployments call the real federal/state registries. For dev we stub
 * each with deterministic results so the workflow can be exercised end-to-end.
 *
 * Per CLAUDE.md 42 CFR Part 455: required checks are NPI registry, PECOS,
 * LEIE (OIG exclusions), SAM.gov, state license board, DEA registry.
 */

import { logger } from '@medguard360/shared';
import { PsvSource, PsvStatus } from './types';

export interface PsvResult {
  source: PsvSource;
  status: PsvStatus;
  resultSummary: string;
  sourceReference?: string;
  rawResponse?: unknown;
  expiresAt?: Date;
}

export interface PsvInput {
  providerId: string;
  npi: string;
  stateCode: string;
  deaNumber?: string;
  licenseNumber?: string;
  licenseState?: string;
}

export async function runAllPsv(input: PsvInput): Promise<PsvResult[]> {
  const checks = await Promise.all([
    checkNpiRegistry(input),
    checkPecos(input),
    checkLeie(input),
    checkSamGov(input),
    checkStateLicenseBoard(input),
    checkDeaRegistry(input),
  ]);
  return checks;
}

async function checkNpiRegistry(input: PsvInput): Promise<PsvResult> {
  // Real call: GET https://npiregistry.cms.hhs.gov/api/?number=<npi>
  if (!/^\d{10}$/.test(input.npi)) {
    return { source: 'npi_registry', status: 'flagged', resultSummary: 'Invalid NPI format' };
  }
  return {
    source: 'npi_registry', status: 'clear',
    resultSummary: `NPI ${input.npi} active in NPPES`,
    sourceReference: input.npi,
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  };
}

async function checkPecos(input: PsvInput): Promise<PsvResult> {
  // Real: PECOS individual / org lookup via CMS API. Stub: clear.
  return {
    source: 'pecos', status: 'clear',
    resultSummary: 'No PECOS enrollment issues identified',
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  };
}

async function checkLeie(input: PsvInput): Promise<PsvResult> {
  // Real: download/lookup against OIG LEIE monthly file
  // Stub: 5% deterministic flag rate by NPI hash so the workflow exercises both paths
  const hash = input.npi.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  if (hash % 20 === 0) {
    return {
      source: 'leie', status: 'flagged',
      resultSummary: 'Provider may match an OIG LEIE exclusion record — manual review required',
      sourceReference: `LEIE-MATCH-${input.npi}`,
    };
  }
  return {
    source: 'leie', status: 'clear',
    resultSummary: 'No OIG LEIE exclusion found',
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  };
}

async function checkSamGov(input: PsvInput): Promise<PsvResult> {
  return {
    source: 'sam_gov', status: 'clear',
    resultSummary: 'Provider not present in SAM.gov exclusions',
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  };
}

async function checkStateLicenseBoard(input: PsvInput): Promise<PsvResult> {
  if (!input.licenseNumber) {
    return {
      source: 'state_license_board', status: 'pending',
      resultSummary: 'License number not yet provided in application',
    };
  }
  return {
    source: 'state_license_board', status: 'clear',
    resultSummary: `${input.licenseState ?? input.stateCode} medical board reports license ${input.licenseNumber} active`,
    sourceReference: input.licenseNumber,
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  };
}

async function checkDeaRegistry(input: PsvInput): Promise<PsvResult> {
  if (!input.deaNumber) {
    return {
      source: 'dea_registry', status: 'clear',
      resultSummary: 'No DEA number on application (provider may not prescribe controlled substances)',
    };
  }
  if (!/^[A-Z]{2}\d{7}$/.test(input.deaNumber)) {
    return { source: 'dea_registry', status: 'flagged',
             resultSummary: `DEA number ${input.deaNumber} fails checksum / format validation` };
  }
  return {
    source: 'dea_registry', status: 'clear',
    resultSummary: `DEA registration ${input.deaNumber} active`,
    sourceReference: input.deaNumber,
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  };
}

export function summarizePsv(results: PsvResult[]): { flagged: boolean; allClear: boolean; summary: string } {
  const flagged = results.filter(r => r.status === 'flagged');
  const pending = results.filter(r => r.status === 'pending');
  if (flagged.length) {
    logger.warn('psv flagged', { count: flagged.length, sources: flagged.map(r => r.source) });
    return {
      flagged: true, allClear: false,
      summary: `${flagged.length} PSV check(s) flagged: ${flagged.map(r => r.source).join(', ')}. Manual review required.`,
    };
  }
  if (pending.length) {
    return {
      flagged: false, allClear: false,
      summary: `${pending.length} PSV check(s) pending: ${pending.map(r => r.source).join(', ')}.`,
    };
  }
  return { flagged: false, allClear: true, summary: 'All PSV checks cleared.' };
}
