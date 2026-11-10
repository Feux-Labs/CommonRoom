import { AwsClient } from 'aws4fetch';

/** Cloudflare R2 (S3-compatible). Keys stay on the server; browsers only ever get short-lived signed URLs. */
export class R2NotConfiguredError extends Error {
  constructor() {
    super('Media storage is not configured.');
  }
}

function config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET ?? process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new R2NotConfiguredError();
  return {
    bucket,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    client: new AwsClient({ service: 's3', region: 'auto', accessKeyId, secretAccessKey }),
  };
}

const objectUrl = (endpoint: string, bucket: string, key: string) =>
  `${endpoint}/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;

/** Signed PUT URL. Content-Type and Content-Length are part of the signature, so the upload must match. */
export async function presignUpload(key: string, contentType: string, size: number, expiresSeconds = 600): Promise<string> {
  const { client, endpoint, bucket } = config();
  const request = new Request(`${objectUrl(endpoint, bucket, key)}?X-Amz-Expires=${expiresSeconds}`, {
    method: 'PUT',
    headers: { 'Content-Type': contentType, 'Content-Length': String(size) },
  });
  const signed = await client.sign(request, { aws: { signQuery: true, allHeaders: true } });
  return signed.url.toString();
}

export async function deleteObjects(keys: string[]): Promise<void> {
  const { client, endpoint, bucket } = config();
  await Promise.all(keys.map(async (key) => {
    const response = await client.fetch(objectUrl(endpoint, bucket, key), { method: 'DELETE' });
    if (!response.ok && response.status !== 404) throw new Error(`R2 delete failed (${response.status}).`);
  }));
}

/** Size in bytes of a stored object, or null when it does not exist. */
export async function objectSize(key: string): Promise<number | null> {
  const { client, endpoint, bucket } = config();
  const response = await client.fetch(objectUrl(endpoint, bucket, key), { method: 'HEAD' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`R2 lookup failed (${response.status}).`);
  return Number(response.headers.get('content-length') ?? 0);
}

/** Deletes every object whose key starts with `prefix` (for example "<user-id>/"). Returns the keys that were removed. */
export async function deletePrefix(prefix: string, limit = 2000): Promise<string[]> {
  const { client, endpoint, bucket } = config();
  const removedKeys: string[] = [];
  let token: string | null = null;
  do {
    const query: string = `list-type=2&prefix=${encodeURIComponent(prefix)}${token ? `&continuation-token=${encodeURIComponent(token)}` : ''}`;
    const response = await client.fetch(`${endpoint}/${bucket}?${query}`);
    if (!response.ok) throw new Error(`R2 list failed (${response.status}).`);
    const xml = await response.text();
    const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((match) => match[1].replace(/&amp;/g, '&'));
    await deleteObjects(keys);
    removedKeys.push(...keys);
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml)?.[1] ?? null : null;
  } while (token && removedKeys.length < limit);
  return removedKeys;
}

/** Reads a stored object's bytes (for scanning). Returns null if it is missing or larger than `maxBytes`. */
export async function getObjectBytes(key: string, maxBytes: number): Promise<Uint8Array | null> {
  const { client, endpoint, bucket } = config();
  const response = await client.fetch(objectUrl(endpoint, bucket, key));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`R2 read failed (${response.status}).`);
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > maxBytes) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  return bytes.byteLength > maxBytes ? null : bytes;
}
