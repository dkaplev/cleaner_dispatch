"use client";

const MAX_SIDE = 1920; // match server compress-image.ts
const JPEG_QUALITY = 0.85; // 85%, match server

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Compress image in the browser (resize to max 1920px, export as JPEG 85%).
 * Mirrors server logic in compress-image.ts for consistent storage size.
 * Returns a Blob (image/jpeg) or the original file if compression fails.
 */
export function compressImageForUpload(file: File): Promise<Blob> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Promise.resolve(file as unknown as Blob);
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");

    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w <= MAX_SIDE && h <= MAX_SIDE) {
        w = img.naturalWidth;
        h = img.naturalHeight;
      } else if (w >= h) {
        w = MAX_SIDE;
        h = Math.round((img.naturalHeight * MAX_SIDE) / img.naturalWidth);
      } else {
        h = MAX_SIDE;
        w = Math.round((img.naturalWidth * MAX_SIDE) / img.naturalHeight);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file as unknown as Blob);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else resolve(file as unknown as Blob);
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file as unknown as Blob);
    };

    img.src = url;
  });
}

/** Base name for stored file after compression (we always store as JPEG). */
export function compressedPhotoPathname(jobId: string, originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/i, "") || "photo";
  return `jobs/${jobId}/${base}.jpg`;
}
