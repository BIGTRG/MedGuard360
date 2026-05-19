import fetch from 'node-fetch';
import { createLogger } from '@medguard360/shared';
import { AudioProcessResult } from './types';
import * as repo from './repository';

const logger = createLogger('clinical-doc-service');

const STT_URL = process.env.STT_SERVICE_URL ?? 'http://speech-to-text:8001';
const NLP_URL = process.env.NLP_SERVICE_URL ?? 'http://clinical-nlp:8002';

export async function processAudio(encounterId: string, audioFilePath: string): Promise<AudioProcessResult> {
  // Step 1: Transcribe
  const sttRes = await fetch(`${STT_URL}/v1/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_file_path: audioFilePath }),
  });
  if (!sttRes.ok) throw new Error(`Speech-to-text failed: ${sttRes.status}`);
  const sttData = await sttRes.json() as { text: string };

  // Step 2: Save transcript document
  await repo.addDocument(encounterId, 'transcript', undefined, sttData.text, {});
  await repo.updateEncounter(encounterId, { transcript: sttData.text, status: 'transcribed' });

  // Step 3: NLP analysis
  const nlpRes = await fetch(`${NLP_URL}/v1/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sttData.text, encounter_id: encounterId }),
  });
  if (!nlpRes.ok) {
    logger.warn('Clinical NLP unavailable, skipping code suggestion');
    return {
      transcript: sttData.text,
      suggestedDiagnosisCodes: [],
      suggestedProcedureCodes: [],
    };
  }
  const nlpData = await nlpRes.json() as {
    suggested_diagnosis_codes: Array<{ code: string; description: string; confidence: number; rationale: string }>;
    suggested_procedure_codes: Array<{ code: string; description: string; confidence: number; rationale: string }>;
  };

  // Step 4: Save coding suggestion + update encounter
  await repo.addDocument(encounterId, 'coding_suggestion', undefined, JSON.stringify(nlpData), {});
  await repo.updateEncounter(encounterId, {
    suggested_diagnosis_codes: nlpData.suggested_diagnosis_codes as any,
    suggested_procedure_codes: nlpData.suggested_procedure_codes as any,
    status: 'coded',
  });

  return {
    transcript: sttData.text,
    suggestedDiagnosisCodes: nlpData.suggested_diagnosis_codes,
    suggestedProcedureCodes: nlpData.suggested_procedure_codes,
  };
}
