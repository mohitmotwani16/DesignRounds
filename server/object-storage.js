import { DeleteObjectCommand, DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { query, queryOne } from "./db.js";

const EXTENSIONS = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "mp4", "audio/wav": "wav" };

const accountId = process.env.R2_ACCOUNT_ID?.trim();
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
const bucket = process.env.R2_BUCKET_NAME?.trim();
const jurisdiction = process.env.R2_JURISDICTION?.trim();

const configured = Boolean(accountId && accessKeyId && secretAccessKey && bucket);

let client;
function s3() {
  if (!configured) return null;
  if (!client) {
    const host = jurisdiction
      ? `${accountId}.${jurisdiction}.r2.cloudflarestorage.com`
      : `${accountId}.r2.cloudflarestorage.com`;
    client = new S3Client({
      region: "auto",
      endpoint: `https://${host}`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return client;
}

export const objectStorage = {
  enabled: configured,
  bucket: bucket || null,
  provider: configured ? "cloudflare-r2" : "postgres-bytea",
};

export function describeObjectStorage() {
  return objectStorage.enabled ? `${objectStorage.provider}/${objectStorage.bucket}` : objectStorage.provider;
}

export function interviewAudioKey(userId, sessionId, turnId, mimeType) {
  const ext = EXTENSIONS[mimeType] || "bin";
  return `interview-audio/${userId}/${sessionId}/${turnId}.${ext}`;
}

export async function putInterviewAudio({ key, bytes, contentType }) {
  const s3Client = s3();
  if (!s3Client) throw new Error("Object storage is not configured.");
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: bytes,
    ContentType: contentType,
  }));
}

async function deleteKeys(keys) {
  const unique = [...new Set(keys.filter(Boolean))];
  if (!unique.length) return;
  const s3Client = s3();
  if (!s3Client) return;
  if (unique.length === 1) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: unique[0] }));
    return;
  }
  await s3Client.send(new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: { Objects: unique.map((key) => ({ Key: key })), Quiet: true },
  }));
}

export async function deleteInterviewAudioForTurn(turnId) {
  const row = await queryOne("select storage_key from interview_audio where turn_id = $1", [turnId]);
  await deleteKeys([row?.storage_key]);
}

export async function deleteInterviewAudioForSession(sessionId) {
  const rows = await query(
    `select a.storage_key from interview_audio a
       join interview_turns t on t.id = a.turn_id
      where t.session_id = $1 and a.storage_key is not null`,
    [sessionId]
  );
  await deleteKeys(rows.map((row) => row.storage_key));
}

export async function deleteInterviewAudioForUser(userId) {
  const rows = await query("select storage_key from interview_audio where user_id = $1 and storage_key is not null", [userId]);
  await deleteKeys(rows.map((row) => row.storage_key));
}

export async function purgeInterviewAudioObjects(rows) {
  await deleteKeys(rows.map((row) => row.storage_key));
}
