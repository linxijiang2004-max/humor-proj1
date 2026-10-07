// Browser-only: shrinks a photo before upload so large camera files upload
// fast and fit under MAX_IMAGE_BYTES. GIFs are left alone to keep animation.

const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.8;

export async function downscaleImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;

  // from-image applies EXIF rotation, so portrait photos stay upright.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

  // Already small and already JPEG: re-encoding would only lose quality.
  if (scale === 1 && file.type === "image/jpeg") {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ffffff"; // JPEG has no transparency
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("Couldn't process this image.");

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
