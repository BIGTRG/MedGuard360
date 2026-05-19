import { Client } from 'minio';
import crypto from 'node:crypto';

let _client: Client | undefined;
function client(): Client {
  if (!_client) {
    _client = new Client({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: Number.parseInt(process.env.MINIO_PORT ?? '9000', 10),
      useSSL: (process.env.MINIO_SSL ?? 'false') === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'medguard',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'medguard',
    });
  }
  return _client;
}

export async function upload(applicationId: string, filename: string, mime: string, data: Buffer): Promise<{ bucket: string; objectKey: string; sizeBytes: number; sha256: string }> {
  const bucket = 'credentialing-docs';
  const sha256 = crypto.createHash('sha256').update(data).digest('hex');
  const objectKey = `${applicationId}/${Date.now()}-${filename}`;
  await client().putObject(bucket, objectKey, data, data.length, { 'Content-Type': mime });
  return { bucket, objectKey, sizeBytes: data.length, sha256 };
}

export async function presignedUrl(bucket: string, key: string, ttlSeconds = 300): Promise<string> {
  return client().presignedGetObject(bucket, key, ttlSeconds);
}
