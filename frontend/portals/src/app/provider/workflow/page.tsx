'use client';

import { useState } from 'react';
import {
  MicrophoneIcon, DocumentTextIcon, SparklesIcon, BeakerIcon,
  CurrencyDollarIcon, ShieldCheckIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

type StepStatus = 'idle' | 'running' | 'done' | 'error';

interface Step {
  key: string;
  title: string;
  desc: string;
  icon: typeof MicrophoneIcon;
  output?: string;
  status: StepStatus;
}

const INITIAL: Step[] = [
  { key: 'start',       title: '1. Start encounter',           desc: 'Patient checked in. Create clinical_encounter row.',                              icon: DocumentTextIcon, status: 'idle' },
  { key: 'capture',     title: '2. Voice capture',             desc: 'Record provider-patient conversation; upload .wav to MinIO.',                     icon: MicrophoneIcon,   status: 'idle' },
  { key: 'transcribe',  title: '3. Whisper transcription',     desc: 'speech-to-text engine (port 8001) returns timestamped transcript.',               icon: SparklesIcon,     status: 'idle' },
  { key: 'nlp',         title: '4. Clinical NLP',              desc: 'clinical-nlp engine (8002) extracts diagnoses, procedures, meds, allergies.',     icon: BeakerIcon,       status: 'idle' },
  { key: 'code',        title: '5. ICD-10 / CPT suggestions',  desc: 'Engine maps entities → suggested ICD-10-CM diagnoses + CPT/HCPCS procedures.',    icon: SparklesIcon,     status: 'idle' },
  { key: 'pa-check',    title: '6. PA pre-check (Da Vinci CRD)', desc: 'davinci-pas adapter asks payer whether any code requires prior auth.',           icon: ShieldCheckIcon,  status: 'idle' },
  { key: 'claim',       title: '7. Draft 837P claim',          desc: 'claims-service builds X12 5010 envelope from coded encounter.',                   icon: CurrencyDollarIcon, status: 'idle' },
  { key: 'fraud',       title: '8. Pre-submission fraud scan', desc: 'fraud-engine (8004) scores the draft against state threshold before submission.', icon: ShieldCheckIcon,  status: 'idle' },
  { key: 'submit',      title: '9. Submit to payer',           desc: 'nctracks adapter pushes 837P; receives 999 + 277CA acknowledgments.',             icon: CheckCircleIcon,  status: 'idle' },
];

const DEMO_OUTPUTS: Record<string, string> = {
  start:      'encounter_id = 60000000-0000-0000-0000-000000000099 (status: in_progress)',
  capture:    'audio uploaded → minio://clinical-audio/60000000.../session.wav (4.2 MB, 6m 14s)',
  transcribe: 'PROVIDER: How long have you been having the chest pain?\nPATIENT: About three weeks now, mostly when I climb stairs...\n[+219 more lines]',
  nlp:        'Entities extracted:\n  • Diagnosis: chest pain (R07.9), shortness of breath (R06.02)\n  • Procedure: ECG performed\n  • Medication mentioned: metoprolol 25mg\n  • Negation: no jaw pain, no nausea',
  code:       'Suggested codes (human review required):\n  ICD-10-CM: R07.9 (Chest pain, unspecified)  conf=0.94\n  ICD-10-CM: I20.9 (Angina pectoris, unsp.)    conf=0.61\n  CPT:       93000 (ECG with interpretation)   conf=0.97\n  CPT:       99214 (Office visit, level 4)     conf=0.88',
  'pa-check': 'Da Vinci CRD response:\n  93000  — no PA required\n  99214  — no PA required\n  → all codes clear, no Da Vinci DTR questionnaire needed',
  claim:     '837P envelope drafted:\n  ISA*00*          *00*          *ZZ*MEDGUARD360...\n  BHT*0019*00*260522-000099*20260522*1240*CH~\n  CLM*260522-000099*128.50***11:B:1*Y*A*Y*Y*P~\n  → 14 segments, 2 service lines, total $128.50',
  fraud:     'fraud-engine score = 12/100 (auto_pay)\n  Flags: none\n  Reason: provider in-network, services match diagnoses, normal billing pattern.',
  submit:    '999 acknowledgment received: A (accepted)\n277CA: claim accepted by NCTracks → adjudication queue\nclaim.submitted event emitted to Kafka',
};

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function WorkflowInner(): React.ReactElement {
  const [steps, setSteps] = useState<Step[]>(INITIAL);
  const [running, setRunning] = useState(false);

  async function runAll() {
    setRunning(true);
    let next = INITIAL.map(s => ({ ...s, status: 'idle' as StepStatus, output: undefined as string | undefined }));
    setSteps(next);
    for (let i = 0; i < next.length; i++) {
      next = next.map((s, idx) => idx === i ? { ...s, status: 'running' } : s);
      setSteps([...next]);
      await delay(800);
      next = next.map((s, idx) => idx === i ? { ...s, status: 'done', output: DEMO_OUTPUTS[s.key] } : s);
      setSteps([...next]);
    }
    setRunning(false);
  }

  function reset() { setSteps(INITIAL); }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">End-to-end clinical workflow</h2>
          <p className="text-sm text-slate-600 max-w-2xl mt-1">
            9-step pipeline from patient arrival → claim submission. Each step calls a
            real MedGuard360 service (in this demo the AI engines run in stub mode;
            NCTracks adapter is stubbed pending the Trading Partner Agreement).
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">Reset</button>
          <button onClick={runAll} disabled={running} className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {running ? 'Running…' : 'Run pipeline'}
          </button>
        </div>
      </div>

      <ol className="space-y-3">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.key} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className={
                  'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ' +
                  (s.status === 'done' ? 'bg-green-50 text-green-700'
                   : s.status === 'running' ? 'bg-amber-50 text-amber-700 animate-pulse'
                   : s.status === 'error' ? 'bg-red-50 text-red-700'
                   : 'bg-slate-50 text-slate-400')
                }>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{s.title}</span>
                    {s.status === 'running' && <span className="badge-yellow">running</span>}
                    {s.status === 'done'    && <span className="badge-green">done</span>}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{s.desc}</p>
                  {s.output && (
                    <pre className="mt-3 whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700 border border-slate-200">{s.output}</pre>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        <strong>AI governance enforced:</strong> step 5 (code suggestions), step 6 (PA pre-check),
        and step 8 (fraud score) require a human to accept before step 9 (submit). The platform
        never auto-submits a claim, denies a PA, or blocks a provider without human review —
        see the AI Governance Framework in CLAUDE.md.
      </div>
    </div>
  );
}

export default function ProviderWorkflowPage(): React.ReactElement {
  return (
    <AuthGate>
      <AppShell>
        <WorkflowInner />
      </AppShell>
    </AuthGate>
  );
}
