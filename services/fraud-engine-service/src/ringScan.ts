/**
 * Ring-scan orchestrator.
 *
 * fraud-ring-gnn expects a graph of (nodes, edges). For dev we assemble a
 * small graph from claims + provider/patient identifiers in Postgres. In
 * production this is a nightly batch that snapshots a much larger window.
 *
 * The orchestrator owns the graph-building; the AI engine owns the
 * detection algorithm.
 */

import axios from 'axios';
import { config, query, logger, UpstreamError } from '@medguard360/shared';

const ringGnnBase = process.env.FRAUD_RING_GNN_URL ?? 'http://localhost:8005';

const ringEngine = axios.create({
  baseURL: ringGnnBase,
  timeout: 30_000,
  headers: { 'x-service-caller': config.serviceName },
});
ringEngine.interceptors.response.use(r => r, err => Promise.reject(new UpstreamError('fraud-ring-gnn', err.message)));

interface RingNode {
  id: string;
  type: 'provider' | 'patient' | 'facility' | 'address' | 'phone' | 'bank_account' | 'npi' | 'ein';
  label?: string;
}
interface RingEdge { source: string; target: string; relation: string; weight?: number }
interface RingDetectResp {
  engine_version: string;
  total_nodes: number;
  total_edges: number;
  rings: Array<{
    members: string[];
    size: number;
    suspicion_score: number;
    shared_attributes: string[];
    explanation: string;
  }>;
}

/** Build a graph snapshot from recent claims. Aggregates provider+patient
 *  pairs and links them via shared NPI / EIN as a starter signal. */
async function buildGraph(windowDays: number): Promise<{ nodes: RingNode[]; edges: RingEdge[] }> {
  const r = await query<{
    billing_provider_id: string; patient_id: string;
    provider_npi: string | null; provider_ein: string | null;
  }>(
    'fraud.ringScan.buildGraph',
    `SELECT c.billing_provider_id, c.patient_id, p.npi AS provider_npi, p.ein AS provider_ein
       FROM claims c
       LEFT JOIN providers p ON p.id = c.billing_provider_id
      WHERE c.submitted_at > now() - interval '${windowDays} days'
      LIMIT 5000`,
  );

  const nodes = new Map<string, RingNode>();
  const edges: RingEdge[] = [];
  for (const row of r.rows) {
    if (!nodes.has(row.billing_provider_id)) {
      nodes.set(row.billing_provider_id, { id: row.billing_provider_id, type: 'provider' });
    }
    if (!nodes.has(row.patient_id)) {
      nodes.set(row.patient_id, { id: row.patient_id, type: 'patient' });
    }
    edges.push({ source: row.billing_provider_id, target: row.patient_id, relation: 'bills' });

    if (row.provider_npi) {
      const npiId = `npi:${row.provider_npi}`;
      if (!nodes.has(npiId)) nodes.set(npiId, { id: npiId, type: 'npi' });
      edges.push({ source: row.billing_provider_id, target: npiId, relation: 'has_npi' });
    }
    if (row.provider_ein) {
      const einId = `ein:${row.provider_ein}`;
      if (!nodes.has(einId)) nodes.set(einId, { id: einId, type: 'ein' });
      edges.push({ source: row.billing_provider_id, target: einId, relation: 'shared_ein' });
    }
  }
  return { nodes: [...nodes.values()], edges };
}

export async function runRingScan(windowDays = 30, minRingSize = 3): Promise<RingDetectResp> {
  const graph = await buildGraph(windowDays);
  logger.info('fraud ring scan assembled graph', {
    nodeCount: graph.nodes.length, edgeCount: graph.edges.length, windowDays,
  });

  if (graph.nodes.length === 0) {
    return {
      engine_version: 'orchestrator-only',
      total_nodes: 0, total_edges: 0,
      rings: [],
    };
  }

  const resp = await ringEngine.post<RingDetectResp>('/v1/detect', {
    nodes: graph.nodes,
    edges: graph.edges,
    min_ring_size: minRingSize,
  });
  return resp.data;
}
