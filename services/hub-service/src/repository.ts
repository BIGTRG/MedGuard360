/**
 * Data access layer for hub_calls table.
 */

import { query, NotFoundError } from '@medguard360/shared';
import {
  HubCallRow,
  DailyStatRow,
  CreateCallInput,
  UpdateCallInput,
  EndCallInput,
  ListCallsFilters,
} from './types';

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Insert a new hub_calls row and return the full row.
 */
export async function createCall(data: CreateCallInput): Promise<HubCallRow> {
  const r = await query<HubCallRow>(
    'hub.createCall',
    `INSERT INTO hub_calls (state_code, caller_type, caller_id, channel)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      data.stateCode,
      data.callerType,
      data.callerId ?? null,
      data.channel,
    ],
  );
  return r.rows[0];
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Partially update a hub_calls row (intent, AI fields, flags, transcript).
 * Automatically sets updated_at = NOW().
 */
export async function updateCall(id: string, data: UpdateCallInput): Promise<HubCallRow> {
  const setClauses: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let idx = 1;

  if (data.intent !== undefined) {
    setClauses.push(`intent = $${idx++}`);
    params.push(data.intent);
  }
  if (data.aiClassification !== undefined) {
    setClauses.push(`ai_classification = $${idx++}`);
    params.push(data.aiClassification);
  }
  if (data.aiConfidence !== undefined) {
    setClauses.push(`ai_confidence = $${idx++}`);
    params.push(data.aiConfidence);
  }
  if (data.crisisFlag !== undefined) {
    setClauses.push(`crisis_flag = $${idx++}`);
    params.push(data.crisisFlag);
  }
  if (data.fraudFlag !== undefined) {
    setClauses.push(`fraud_flag = $${idx++}`);
    params.push(data.fraudFlag);
  }
  if (data.transcript !== undefined) {
    setClauses.push(`transcript = $${idx++}`);
    params.push(data.transcript);
  }

  params.push(id);
  const r = await query<HubCallRow>(
    'hub.updateCall',
    `UPDATE hub_calls SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    params,
  );

  if (!r.rows[0]) throw new NotFoundError('HubCall');
  return r.rows[0];
}

// ---------------------------------------------------------------------------
// End call
// ---------------------------------------------------------------------------

/**
 * Mark a call as ended: set resolution, duration_seconds, transcript.
 */
export async function endCall(id: string, data: EndCallInput): Promise<HubCallRow> {
  const r = await query<HubCallRow>(
    'hub.endCall',
    `UPDATE hub_calls
     SET resolution        = $2,
         duration_seconds  = $3,
         transcript        = COALESCE($4, transcript),
         updated_at        = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.resolution,
      data.durationSeconds ?? null,
      data.transcript ?? null,
    ],
  );

  if (!r.rows[0]) throw new NotFoundError('HubCall');
  return r.rows[0];
}

// ---------------------------------------------------------------------------
// Read single
// ---------------------------------------------------------------------------

/**
 * Retrieve a single hub_calls row by ID. Throws NotFoundError if absent.
 */
export async function findCall(id: string): Promise<HubCallRow> {
  const r = await query<HubCallRow>(
    'hub.findCall',
    `SELECT * FROM hub_calls WHERE id = $1`,
    [id],
  );
  if (!r.rows[0]) throw new NotFoundError('HubCall');
  return r.rows[0];
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

/**
 * List hub_calls rows with optional filters. Ordered by created_at DESC.
 */
export async function listCalls(filters: ListCallsFilters): Promise<HubCallRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.stateCode) {
    conditions.push(`state_code = $${idx++}`);
    params.push(filters.stateCode);
  }
  if (filters.intent) {
    conditions.push(`intent = $${idx++}`);
    params.push(filters.intent);
  }
  if (filters.crisisFlag !== undefined) {
    conditions.push(`crisis_flag = $${idx++}`);
    params.push(filters.crisisFlag);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 100;
  params.push(limit);

  const r = await query<HubCallRow>(
    'hub.listCalls',
    `SELECT * FROM hub_calls ${where} ORDER BY created_at DESC LIMIT $${idx}`,
    params,
  );
  return r.rows;
}

// ---------------------------------------------------------------------------
// Daily stats
// ---------------------------------------------------------------------------

/**
 * Return a count of calls grouped by intent for the given state and calendar date.
 * Used by the dashboard / reporting-service.
 */
export async function getDailyStats(stateCode: string, date: Date): Promise<DailyStatRow[]> {
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const r = await query<DailyStatRow>(
    'hub.getDailyStats',
    `SELECT intent, COUNT(*)::integer AS count
     FROM hub_calls
     WHERE state_code = $1
       AND DATE(created_at) = $2::date
     GROUP BY intent
     ORDER BY count DESC`,
    [stateCode, dateStr],
  );
  return r.rows;
}
