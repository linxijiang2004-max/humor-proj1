"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { ALLOWED_IMAGE_TYPES, validateImageFile } from "@/lib/image-upload";
import { downscaleImage } from "@/lib/image-resize";
import {
  generateCaptions,
  publishCaption,
  uploadImage,
  uploadImageFromUrl,
  type UploadResult,
  type CandidateCaption,
  type UploadedImage,
} from "./actions";

const buttonClass =
  "rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60";
const secondaryButtonClass =
  "rounded-lg border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-900";

export default function NewCaptionFlow() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [captions, setCaptions] = useState<CandidateCaption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"uploading" | "generating" | null>(null);
  const [pending, startTransition] = useTransition();
  const [published, setPublished] = useState<Set<number>>(new Set());
  const [publishing, setPublishing] = useState<number | null>(null);
  const [link, setLink] = useState("");

  // Free the previous preview's memory whenever it is replaced or unmounted.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    event.target.value = ""; // allow picking the same file again later
    if (!picked) return;

    // Type first, then size: the size limit applies to the downscaled file,
    // so large camera photos are fine.
    if (!ALLOWED_IMAGE_TYPES.includes(picked.type)) {
      setError(validateImageFile(picked));
      return;
    }
    let chosen: File;
    try {
      chosen = await downscaleImage(picked);
    } catch {
      setError("Couldn't read that image. Try a different file.");
      return;
    }
    const invalid = validateImageFile(chosen);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setFile(chosen);
    setPreview(URL.createObjectURL(chosen));
    setImage(null);
    setCaptions(null);
  }

  function generate(target: UploadedImage) {
    setError(null);
    setStatus("generating");
    startTransition(async () => {
      const result = await generateCaptions(target.id);
      setStatus(null);
      if ("error" in result) setError(result.error);
      else setCaptions(result.captions);
    });
  }

  function uploadAndGenerate() {
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    storeAndGenerate(() => uploadImage(formData));
  }

  function linkAndGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!link.trim()) return;
    storeAndGenerate(() => uploadImageFromUrl(link));
  }

  function storeAndGenerate(store: () => Promise<UploadResult>) {
    setError(null);
    setStatus("uploading");
    startTransition(async () => {
      const result = await store();
      if ("error" in result) {
        setStatus(null);
        setError(result.error);
        return;
      }
      setImage(result.image);

      setStatus("generating");
      const generated = await generateCaptions(result.image.id);
      setStatus(null);
      if ("error" in generated) setError(generated.error);
      else setCaptions(generated.captions);
    });
  }

  async function publish(captionId: number) {
    setError(null);
    setPublishing(captionId);
    const result = await publishCaption(captionId);
    setPublishing(null);
    if ("error" in result) setError(result.error);
    else setPublished((current) => new Set(current).add(captionId));
  }

  function startOver() {
    setLink("");
    setFile(null);
    setPreview(null);
    setImage(null);
    setCaptions(null);
    setError(null);
  }

  const imageSrc = image?.url ?? preview;

  return (
    <div className="flex flex-col gap-6">
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt="Image to caption"
          className="max-h-96 w-full rounded-lg border border-gray-200 object-contain dark:border-gray-800"
        />
      ) : (
        <>
          <label className="flex h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-600 focus-within:border-blue-600 dark:border-gray-700">
            <input
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              onChange={onFileChange}
              className="sr-only"
            />
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="font-medium">Click to choose an image</span>
            <span className="text-xs">PNG, JPEG, WebP or GIF (GIFs up to 5 MB)</span>
          </label>

          <form onSubmit={linkAndGenerate} className="flex flex-col gap-2">
            <label htmlFor="image-link" className="text-sm text-gray-500">
              Or paste an image link
            </label>
            <div className="flex gap-2">
              <input
                id="image-link"
                type="url"
                inputMode="url"
                placeholder="https://…"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                disabled={pending}
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent"
              />
              <button type="submit" disabled={pending || !link.trim()} className={secondaryButtonClass}>
                Use link
              </button>
            </div>
          </form>
        </>
      )}

      {error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {status && (
        <p aria-live="polite" className="text-sm text-gray-500">
          {status === "uploading" ? (link ? "Downloading image…" : "Uploading image…") : "Asking Gemini for captions… this can take a few seconds."}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {file && !image && (
          <button onClick={uploadAndGenerate} disabled={pending} className={buttonClass}>
            Upload & generate captions
          </button>
        )}
        {image && !captions && !pending && (
          <button onClick={() => generate(image)} className={buttonClass}>
            Try generating again
          </button>
        )}
        {image && captions && (
          <button onClick={() => generate(image)} disabled={pending} className={secondaryButtonClass}>
            Generate 4 more
          </button>
        )}
        {(file || image) && (
          <button onClick={startOver} disabled={pending} className={secondaryButtonClass}>
            Use a different image
          </button>
        )}
      </div>

      {captions && (
        <section>
          <h2 className="mb-1 text-xl font-semibold">Candidates</h2>
          <p className="mb-4 text-sm text-gray-500">
            Saved as drafts. Only you can see them until you publish one.
            {published.size > 0 && (
              <>
                {" "}
                <Link href="/?t=week" className="text-gray-900 underline dark:text-gray-100">
                  See it in the feed →
                </Link>
              </>
            )}
          </p>
          <ol className="flex flex-col gap-3">
            {captions.map((caption, i) => (
              <li
                key={caption.id}
                className="flex gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
              >
                <span className="font-mono text-sm text-gray-400">{i + 1}</span>
                <span className="flex-1">{caption.content}</span>
                {published.has(caption.id) ? (
                  <span className="shrink-0 self-center text-sm text-gray-500">Published</span>
                ) : (
                  <button
                    onClick={() => publish(caption.id)}
                    disabled={publishing !== null}
                    className="shrink-0 self-center rounded-md border border-gray-300 px-3 py-1 text-sm font-medium hover:bg-gray-100 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-900"
                  >
                    {publishing === caption.id ? "Publishing…" : "Publish"}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
