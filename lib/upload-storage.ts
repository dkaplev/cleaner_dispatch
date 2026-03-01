import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { put as blobPut, del as blobDel } from "@vercel/blob";

function uniqueId(): string {
  return randomBytes(10).toString("hex");
}

const DEFAULT_DIR = "uploads";

function getUploadDir(): string {
  const base = process.env.UPLOAD_DIR || join(process.cwd(), DEFAULT_DIR);
  return base;
}

function useBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN?.trim();
}

/**
 * Save a file for a job. Returns either a Blob URL (when BLOB_READ_WRITE_TOKEN is set)
 * or a path relative to upload dir for storing in DB.
 */
export async function saveJobPhoto(
  buffer: Buffer,
  jobId: string,
  ext: string
): Promise<string> {
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
  const filename = `${uniqueId()}.${safeExt}`;
  const pathname = `jobs/${jobId}/${filename}`;

  if (useBlob()) {
    const blob = await blobPut(pathname, buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: safeExt === "jpg" || safeExt === "jpeg" ? "image/jpeg" : `image/${safeExt}`,
    });
    return blob.url;
  }

  const base = getUploadDir();
  const dir = join(base, "jobs", jobId);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, filename);
  await writeFile(filePath, buffer);
  return `jobs/${jobId}/${filename}`;
}

/**
 * Resolve relative path (from DB) to absolute path on disk. Only valid for file-based paths (not blob URLs).
 */
export function resolvePhotoPath(relativePath: string): string {
  return join(getUploadDir(), relativePath);
}

/**
 * True if the stored value is a Vercel Blob URL (full URL).
 */
export function isBlobUrl(photoUrl: string): boolean {
  return (
    typeof photoUrl === "string" &&
    (photoUrl.startsWith("http://") || photoUrl.startsWith("https://"))
  );
}

/**
 * Delete a stored photo by path or blob URL. No-op if path is empty or expired placeholder.
 */
export async function deleteStoredPhoto(photoUrl: string): Promise<void> {
  if (!photoUrl || photoUrl === "expired" || photoUrl.startsWith("expired:")) return;
  if (isBlobUrl(photoUrl)) {
    await blobDel(photoUrl).catch(() => {});
    return;
  }
  const absPath = resolvePhotoPath(photoUrl);
  await unlink(absPath).catch(() => {});
}
