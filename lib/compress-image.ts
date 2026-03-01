import sharp from "sharp";

const MAX_SIDE = 1920; // max width or height (aspect ratio preserved)
const JPEG_QUALITY = 85;
const ALLOWED_INPUT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Compress and optionally resize an image for storage.
 * Output is always JPEG for consistency and smaller size.
 * Returns { buffer, ext: 'jpg' } or null if compression fails (caller can fall back to original).
 */
export async function compressJobPhoto(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; ext: string } | null> {
  if (!buffer.length) return null;
  if (!ALLOWED_INPUT_TYPES.has(mimeType)) return null;

  try {
    const out = await sharp(buffer)
      .resize(MAX_SIDE, MAX_SIDE, {
        fit: "inside",
        withoutEnlargement: true, // don't upscale small images
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    return { buffer: out, ext: "jpg" };
  } catch (e) {
    console.warn("[compress-image] Sharp failed, using original:", (e as Error).message);
    return null;
  }
}
