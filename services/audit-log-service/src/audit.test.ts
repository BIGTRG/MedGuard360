import { DomainEvent } from '@medguard360/shared';
import { normalizeAuditEvent } from './normalize';
import { QuerySchema } from './validation';

const baseEvent = (overrides: Partial<DomainEvent>): DomainEvent => ({
  eventId: '00000000-0000-0000-0000-000000000001',
  eventType: 'patient.read',
  eventVersion: 1,
  occurredAt: '2026-06-01T12:00:00.000Z',
  producer: 'patient-service',
  payload: {},
  ...overrides,
});

describe('normalizeAuditEvent', () => {
  it('maps canonical actor payload', () => {
    const n = normalizeAuditEvent(baseEvent({
      eventType: 'patient.read',
      correlationId: 'corr-1',
      payload: {
        actor: { sub: 'user-1', role: 'patient', stateCode: 'NC' },
        resource: 'patient',
        resourceId: 'pat-1',
        action: 'read',
        outcome: 'success',
        context: { phiAccessed: true },
      },
    }));
    expect(n.actorUserId).toBe('user-1');
    expect(n.resource).toBe('patient');
    expect(n.context.phiAccessed).toBe(true);
  });

  it('maps legacy flat payload and preserves leftovers', () => {
    const n = normalizeAuditEvent(baseEvent({
      eventType: 'claim.updated',
      producer: 'claims-service',
      payload: {
        userId: 'user-2',
        resourceType: 'claim',
        resource_id: 'claim-1',
        extraField: 'kept',
      },
    }));
    expect(n.actorUserId).toBe('user-2');
    expect(n.resource).toBe('claim');
    expect(n.resourceId).toBe('claim-1');
    expect(n.context.extraField).toBe('kept');
  });
});

describe('QuerySchema', () => {
  it('accepts legacy userId and from aliases', () => {
    const q = QuerySchema.parse({
      userId: '10000000-0000-0000-0000-000000000001',
      resourceType: 'patient',
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-06-02T00:00:00.000Z',
    });
    expect(q.userId).toBe('10000000-0000-0000-0000-000000000001');
    expect(q.from).toBe('2026-06-01T00:00:00.000Z');
  });
});