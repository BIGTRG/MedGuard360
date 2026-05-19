/**
 * MinIO client for clinical documents.
 *
 * Buckets per CLAUDE.md infrastructure/minio/bootstrap.sh:
 *   clinical-audio       — encounter audio
 *   clinical-video       — telehealth video
 *   clinical-documents   — typed notes + transcripts
 */

import { Client } from 'minio';
import { Readable } from 'node:stream';
import crypto from 'node:crypto';
import { config } from '@medguard360/shared';

let _client: Client | undefined;

function client(): Client {
  if (!_client) {
    _client = new Client({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: Number.parseInt(process.env.MINIO_PORT ?? '9000', 10),
      useSSL: (process.env.MINIO_SSL ?? 'false') === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'medguard',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'medguard',
      region: 'us-east-1',
    });
  }
  return _client;
}

export interface UploadResult {
  bucket: string;
  objectKey: string;
  sizeBytes: number;
  sha256: string;
}

export async function uploadBuffer(bucket: string, encounterId: string, filename: string, mime: string, data: Buffer): Promise<UploadResult> {
  const sha256 = crypto.createHash('sha256').update(data).digest('hex');
  const objectKey = `${encounterId}/${Date.now()}-${filename}`;
  await client().putObject(bucket, objectKey, data, data.length, {
    'Content-Type': mime,
    'X-Amz-Meta-Sha256': sha256,
    'X-Amz-Meta-Service': config.serviceName,
  });
  return { bucket, objectKey, sizeBytes: data.length, sha256 };
}

export async function presignedGetUrl(bucket: string, objectKey: string, ttlSeconds = 300): Promise<string> {
  return client().presignedGetObject(bucket, objectKey, ttlSeconds);
}

export async function downloadToBuffer(bucket: string, objectKey: string): Promise<Buffer> {
  const stream = await client().getObject(bucket, objectKey) as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}
