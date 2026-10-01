// Shared by the profile form (instant feedback) and the server action (the
// real check). Must match the "avatars" bucket limits in the profiles migration.
export const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function validateAvatar(file: File): string | null {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return "The photo must be a PNG, JPEG, WebP or GIF.";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "The photo must be 5 MB or smaller.";
  }
  return null;
}
