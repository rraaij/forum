/*
 * Browser-side image file reading and validation (plan section 7.2).
 *
 * This exists for fast feedback only. The SERVER repeats every
 * security-relevant check (MIME type and decoded byte size) in the
 * profile-edit module, and nothing here can widen what is accepted.
 */

export const MAX_PHOTOS = 12;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function readImageFile(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return Promise.reject(new Error("Choose a JPEG, PNG, WebP, or GIF image."));
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return Promise.reject(new Error(`${file.name} is larger than 2 MB.`));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error(`${file.name} could not be read.`));
    };
    reader.onerror = () => reject(new Error(`${file.name} could not be read.`));
    reader.readAsDataURL(file);
  });
}
