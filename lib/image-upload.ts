// Shared by upload forms (instant feedback) and server actions (the real
// check). Must match the Storage bucket limits in the migrations.
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "The image must be a PNG, JPEG, WebP or GIF.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "The image must be 5 MB or smaller.";
  }
  return null;
}

export function fileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() || "png";
}
