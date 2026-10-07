"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { CAPTION_COUNT, DESCRIBE_PROMPT, captionPrompt } from "@/lib/caption-prompts";
import { GeminiError, fetchImageAsPart, generate } from "@/lib/gemini";
import { fileExtension, validateImageFile } from "@/lib/image-upload";
import { RemoteImageError, fetchRemoteImage } from "@/lib/remote-image";
import { createClient } from "@/lib/supabase/server";

export type UploadedImage = { id: number; url: string };
export type CandidateCaption = { id: number; content: string };

export type UploadResult = { image: UploadedImage } | { error: string };
export type GenerateResult = { requestId: number; captions: CandidateCaption[] } | { error: string };

const seconds = (since: number) => `${((performance.now() - since) / 1000).toFixed(2)}s`;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Puts the bytes in the `images` bucket and records them in `images`.
async function storeImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: File | Buffer,
  contentType: string,
  extension: string,
): Promise<UploadResult> {
  // The image bytes go to Storage; only the public URL is stored in the table.
  const path = `${userId}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(path, body, { contentType });
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  const {
    data: { publicUrl },
  } = supabase.storage.from("images").getPublicUrl(path);

  const { data, error } = await supabase
    .from("images")
    .insert({ url: publicUrl, profile_id: userId })
    .select("id, url")
    .single<UploadedImage>();

  if (error) {
    // Don't leave an untracked file behind in Storage.
    await supabase.storage.from("images").remove([path]);
    return { error: `Couldn't save the image: ${error.message}` };
  }

  return { image: data };
}

// Browser upload. The file was already downscaled client-side.
export async function uploadImage(formData: FormData): Promise<UploadResult> {
  const { supabase, user } = await requireUser();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image first." };
  }
  const invalid = validateImageFile(file);
  if (invalid) return { error: invalid };

  const started = performance.now();
  const result = await storeImage(supabase, user.id, file, file.type, fileExtension(file));
  console.log(`[new] upload: ${(file.size / 1024).toFixed(0)} KB ${file.type} | storage + insert ${seconds(started)}`);
  return result;
}

// Pasted link. We keep our own (downscaled) copy instead of hotlinking, so
// the feed doesn't break when the source site removes or blocks the image.
export async function uploadImageFromUrl(url: string): Promise<UploadResult> {
  const { supabase, user } = await requireUser();
  if (typeof url !== "string" || !url.trim()) return { error: "Paste an image link first." };

  const started = performance.now();
  let remote;
  try {
    remote = await fetchRemoteImage(url);
  } catch (err) {
    if (err instanceof RemoteImageError) return { error: err.message };
    console.error("fetchRemoteImage failed", err);
    return { error: "Couldn't use that link. Try downloading the image and uploading it instead." };
  }
  const downloaded = performance.now();

  const result = await storeImage(supabase, user.id, remote.data, remote.contentType, remote.extension);
  console.log(
    `[new] link: ${(remote.originalBytes / 1024).toFixed(0)} KB → ${(remote.data.length / 1024).toFixed(0)} KB ` +
      `${remote.contentType} | download + resize ${((downloaded - started) / 1000).toFixed(2)}s | storage + insert ${seconds(downloaded)}`,
  );
  return result;
}

type Step = {
  step_index: number;
  step_name: string;
  prompt: string;
  model: string;
  raw_output: string;
};

const CAPTIONS_SCHEMA = {
  type: "OBJECT",
  properties: { captions: { type: "ARRAY", items: { type: "STRING" } } },
  required: ["captions"],
};

function parseCaptions(raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GeminiError("Gemini returned captions in an unexpected format. Please try again.");
  }
  const list = (parsed as { captions?: unknown })?.captions;
  const captions = Array.isArray(list)
    ? list.filter((c): c is string => typeof c === "string").map((c) => c.trim()).filter(Boolean)
    : [];
  if (captions.length < CAPTION_COUNT) {
    throw new GeminiError(`Gemini returned ${captions.length} usable captions instead of ${CAPTION_COUNT}. Please try again.`);
  }
  return captions.slice(0, CAPTION_COUNT);
}

// Two Gemini steps (describe → caption), then one atomic database write.
// Nothing is saved until both Gemini calls succeed, and the write itself is a
// single Postgres transaction (save_caption_request), so a failure anywhere
// leaves no caption_requests, steps, captions or cached description behind.
export async function generateCaptions(imageId: number): Promise<GenerateResult> {
  const started = performance.now();
  const { supabase, user } = await requireUser();

  const { data: image, error: imageError } = await supabase
    .from("images")
    .select("id, url, description, profile_id, is_library")
    .eq("id", imageId)
    .maybeSingle<{
      id: number;
      url: string;
      description: string | null;
      profile_id: string | null;
      is_library: boolean;
    }>();

  if (imageError) return { error: `Couldn't load the image: ${imageError.message}` };
  if (!image || (image.profile_id !== user.id && !image.is_library)) {
    return { error: "Image not found." };
  }

  const steps: Step[] = [];
  let description = image.description;
  let newDescription: string | null = null;

  try {
    // Step 1 "describe": skipped entirely when a description is cached.
    if (!description) {
      const imagePart = await fetchImageAsPart(image.url);
      const result = await generate({ label: "describe", parts: [imagePart, { text: DESCRIBE_PROMPT }] });
      description = newDescription = result.text;
      steps.push({
        step_index: 1,
        step_name: "describe",
        prompt: DESCRIBE_PROMPT,
        model: result.model,
        raw_output: result.text,
      });
    }

    // Step 2 "caption".
    const prompt = captionPrompt(description);
    const result = await generate({ label: "caption", parts: [{ text: prompt }], responseSchema: CAPTIONS_SCHEMA });
    steps.push({
      step_index: 2,
      step_name: "caption",
      prompt,
      model: result.model,
      raw_output: result.text,
    });
    const captions = parseCaptions(result.text);

    const saveStarted = performance.now();
    const { data, error } = await supabase.rpc("save_caption_request", {
      p_image_id: image.id,
      p_description: newDescription,
      p_steps: steps,
      p_captions: captions,
    });

    if (error) {
      console.error("save_caption_request failed", error);
      return { error: `Captions were generated but couldn't be saved: ${error.message}` };
    }

    console.log(`[new] save_caption_request: ${seconds(saveStarted)} | generateCaptions total ${seconds(started)}`);
    const saved = data as { request_id: number; captions: CandidateCaption[] };
    return { requestId: saved.request_id, captions: saved.captions };
  } catch (err) {
    if (err instanceof GeminiError) return { error: err.message };
    console.error("generateCaptions failed", err);
    return { error: "Something went wrong while generating captions. Please try again." };
  }
}

export type PublishResult = { ok: true } | { error: string };

// Moves one of the viewer's own draft captions into the public feed.
export async function publishCaption(captionId: number): Promise<PublishResult> {
  if (!Number.isInteger(captionId)) return { error: "Invalid caption." };
  const { supabase, user } = await requireUser();

  // The update policy only matches the viewer's own rows; the explicit
  // profile_id filter makes "not yours" come back as zero rows, not an error.
  const { data, error } = await supabase
    .from("captions")
    .update({ is_public: true })
    .eq("id", captionId)
    .eq("profile_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return { error: `Couldn't publish: ${error.message}` };
  if (!data) return { error: "Caption not found." };
  return { ok: true };
}
