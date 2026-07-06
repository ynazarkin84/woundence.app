import { createClient } from "@supabase/supabase-js";

const WOUND_IMAGES_BUCKET = "wound-images";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for file storage");
  }
  // Server-side only — the service role key bypasses row-level security and
  // must never be shipped to a client (web bundle or mobile app).
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function ensureWoundImagesBucket(): Promise<void> {
  const client = getClient();
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) throw listError;
  if (buckets?.some((b) => b.name === WOUND_IMAGES_BUCKET)) return;

  const { error: createError } = await client.storage.createBucket(WOUND_IMAGES_BUCKET, {
    public: false,
  });
  if (createError) throw createError;
}

/**
 * Uploads a buffer to Supabase Storage and returns the storage object path
 * (stored in woundenceFiles.filePath / woundenceWoundAssessments.imageUrl in
 * place of what used to be a local disk path).
 */
export async function uploadToStorage(
  objectPath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getClient();
  const { error } = await client.storage
    .from(WOUND_IMAGES_BUCKET)
    .upload(objectPath, buffer, { contentType, upsert: false });
  if (error) throw error;
  return objectPath;
}

/**
 * Signed URLs are short-lived and generated on demand (see GET
 * /api/files/:fileId/image) rather than making the bucket public, since
 * wound photos are patient health data.
 */
export async function getSignedUrl(objectPath: string, expiresInSeconds = 60): Promise<string> {
  const client = getClient();
  const { data, error } = await client.storage
    .from(WOUND_IMAGES_BUCKET)
    .createSignedUrl(objectPath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteFromStorage(objectPath: string): Promise<void> {
  const client = getClient();
  const { error } = await client.storage.from(WOUND_IMAGES_BUCKET).remove([objectPath]);
  if (error) throw error;
}
