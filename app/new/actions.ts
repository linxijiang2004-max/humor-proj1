"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { appendix, assertCallable, fillTemplate, loadCaptionPlan } from "@/lib/caption-chain";
import { CAPTION_COUNT } from "@/lib/caption-prompts";
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
  if (uploadError) {
    console.error("upload failed", uploadError.message);
    return { error: "upload failed" };
  }

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
    console.error("couldn't save the meme", error.message);
    return { error: "couldn't save the meme" };
  }

  return { image: data };
}

// Browser upload. The file was already downscaled client-side.
export async function uploadImage(formData: FormData): Promise<UploadResult> {
  const { supabase, user } = await requireUser();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "pick a meme first" };
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
  if (typeof url !== "string" || !url.trim()) return { error: "paste a link first" };

  const started = performance.now();
  let remote;
  try {
    remote = await fetchRemoteImage(url);
  } catch (err) {
    if (err instanceof RemoteImageError) return { error: err.message };
    console.error("fetchRemoteImage failed", err);
    return { error: "that link didn't work" };
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
    throw new GeminiError("that didn't work, try again");
  }
  const list = (parsed as { captions?: unknown })?.captions;
  const captions = Array.isArray(list)
    ? list.filter((c): c is string => typeof c === "string").map((c) => c.trim()).filter(Boolean)
    : [];
  if (captions.length < CAPTION_COUNT) {
    throw new GeminiError("that didn't work, try again");
  }
  return captions.slice(0, CAPTION_COUNT);
}

// The chain's Gemini steps (describe → … → caption; see lib/caption-chain.ts),
// then one atomic database write. Nothing is saved until every Gemini call
// succeeds, and the write itself is a single Postgres transaction
// (save_caption_request), so a failure anywhere leaves no caption_requests,
// steps, captions or cached description behind.
export async function generateCaptions(imageId: number): Promise<GenerateResult> {
  const started = performance.now();
  const { supabase, user } = await requireUser();

  const [{ data: image, error: imageError }, plan] = await Promise.all([
    supabase
      .from("images")
      .select("id, url, description, profile_id, is_library")
      .eq("id", imageId)
      .maybeSingle<{
        id: number;
        url: string;
        description: string | null;
        profile_id: string | null;
        is_library: boolean;
      }>(),
    loadCaptionPlan(supabase),
  ]);

  if (imageError) {
    console.error("couldn't load the meme", imageError.message);
    return { error: "couldn't load the meme" };
  }
  if (!image || (image.profile_id !== user.id && !image.is_library)) {
    return { error: "meme not found" };
  }

  const steps: Step[] = [];
  let description = image.description;
  let newDescription: string | null = null;
  console.log(`[new] using ${plan.label}${description ? ", description cached" : ""}`);

  try {
    const [describeStep, ...rest] = plan.steps;
    const captionStep = rest[rest.length - 1];
    // Fail before any Gemini call if a step needs a provider bit can't call.
    for (const step of description ? rest : plan.steps) assertCallable(step);

    // Values for later steps' placeholders; each step adds its own output.
    const values: Record<string, string> = { ...plan.extras };
    const run = async (step: (typeof plan.steps)[number], extraParts: Parameters<typeof generate>[0]["parts"] = []) => {
      let prompt = fillTemplate(step.template, values);
      const isCaption = step === captionStep;
      if (isCaption) prompt += appendix(step.template, plan.extras);
      const result = await generate({
        label: step.step_name,
        model: step.model.model_string,
        parts: [...extraParts, { text: prompt }],
        responseSchema: isCaption ? CAPTIONS_SCHEMA : undefined,
      });
      steps.push({
        step_index: step.step_index,
        step_name: step.step_name,
        prompt,
        model: result.model,
        raw_output: result.text,
      });
      values[step.step_name] = values.previous = result.text;
      return result.text;
    };

    // First step "describe": gets the image; skipped when a description is cached.
    if (!description) {
      description = newDescription = await run(describeStep, [await fetchImageAsPart(image.url)]);
    } else {
      values[describeStep.step_name] = values.previous = description;
    }
    values.description = description;

    // Middle steps (if any), then the caption step.
    let raw = "";
    for (const step of rest) raw = await run(step);
    const captions = parseCaptions(raw);

    const saveStarted = performance.now();
    const { data, error } = await supabase.rpc("save_caption_request", {
      p_image_id: image.id,
      p_description: newDescription,
      p_steps: steps,
      p_captions: captions,
    });

    if (error) {
      console.error("save_caption_request failed", error);
      return { error: "couldn't save captions" };
    }

    console.log(`[new] save_caption_request: ${seconds(saveStarted)} | generateCaptions total ${seconds(started)}`);
    const saved = data as { request_id: number; captions: CandidateCaption[] };
    return { requestId: saved.request_id, captions: saved.captions };
  } catch (err) {
    if (err instanceof GeminiError) return { error: err.message };
    console.error("generateCaptions failed", err);
    return { error: "that didn't work, try again" };
  }
}

export type PublishResult = { ok: true } | { error: string };

// Moves one of the viewer's own draft captions into the public feed.
export async function publishCaption(captionId: number): Promise<PublishResult> {
  if (!Number.isInteger(captionId)) return { error: "that didn't work" };
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

  if (error) {
    console.error("couldn't post", error.message);
    return { error: "couldn't post" };
  }
  if (!data) return { error: "caption not found" };
  return { ok: true };
}
