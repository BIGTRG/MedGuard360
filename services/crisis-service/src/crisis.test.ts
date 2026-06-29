import { CreatePlanSchema, ResolveSchema } from './routes';
import { extractClinicalNoteText } from './consumer';

const planInput = {
  patientId: '10000000-0000-0000-0000-000000000001',
  stateCode: 'NC',
  createdByProviderId: '20000000-0000-0000-0000-000000000001',
};

describe('CreatePlanSchema', () => {
  it('accepts minimal crisis plan payload', () => {
    const parsed = CreatePlanSchema.parse(planInput);
    expect(parsed.stateCode).toBe('NC');
  });

  it('accepts optional coping strategies', () => {
    const parsed = CreatePlanSchema.parse({
      ...planInput,
      warningSigns: ['Isolation'],
      internalCopingStrategies: ['Call support line'],
    });
    expect(parsed.warningSigns).toHaveLength(1);
  });
});

describe('ResolveSchema', () => {
  it('allows resolved and false_alarm statuses', () => {
    expect(ResolveSchema.parse({ status: 'resolved' }).status).toBe('resolved');
    expect(ResolveSchema.parse({ status: 'false_alarm' }).status).toBe('false_alarm');
  });

  it('rejects unknown resolution status', () => {
    expect(() => ResolveSchema.parse({ status: 'open' })).toThrow();
  });
});

describe('extractClinicalNoteText', () => {
  it('uses embedded clinical note text from the event payload', () => {
    expect(extractClinicalNoteText({
      encounterId: '40000000-0000-0000-0000-000000000001',
      docId: '50000000-0000-0000-0000-000000000001',
      charCount: 28,
      patientId: '10000000-0000-0000-0000-000000000001',
      stateCode: 'NC',
      extractedText: '  patient reports suicidal intent  ',
    })).toBe('patient reports suicidal intent');
  });

  it('falls back when older events do not include note text', () => {
    expect(extractClinicalNoteText({
      encounterId: '40000000-0000-0000-0000-000000000001',
      docId: '50000000-0000-0000-0000-000000000001',
      charCount: 28,
    })).toBe('');
  });
});