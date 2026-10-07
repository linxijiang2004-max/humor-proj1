import "server-only";
import sharp, { type OutputInfo } from "sharp";

// Minimal Gemini REST client. Server-only: GEMINI_API_KEY must never reach
// the browser, so this module fails the build if a Client Component imports it.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 45_000;

// Pinned to an explicit version so behavior and latency can't change under
// us. Set GEMINI_MODEL in .env.local and in Vercel; never use a "-latest" alias.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Neither step needs extended reasoning, and thinking dominated latency
// (~20s → ~3s on gemini-3.8-flash). Each model accepts different values:
// flash-lite rejects thinkingBudget but takes "minimal"; full flash rejects
// "minimal", and its thinkingBudget: 0 wasn't always honored, but "low" was.
const THINKING_CONFIG = GEMINI_MODEL.includes("flash-lite")
  ? { thinkingLevel: "minimal" }
  : { thinkingLevel: "low" };

// Images sent to Gemini are re-encoded to at most this size.
const MAX_IMAGE_EDGE = 1024;
const JPEG_QUALITY = 80;

// Thrown for any Gemini failure. `message` is safe to show to the user.
export class GeminiError extends Error {}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

type GenerateOptions = {
  // Short name for the server log, e.g. "describe".
  label: string;
  parts: Part[];
  // Ask Gemini for JSON matching this schema instead of free text.
  responseSchema?: object;
};

export type GeminiResult = {
  text: string;
  // The concrete model version that answered (e.g. when GEMINI_MODEL is an
  // alias like "gemini-flash-latest").
  model: string;
};

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

export async function generate({ label, parts, responseSchema }: GenerateOptions): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("Caption generation isn't configured: GEMINI_API_KEY is missing on the server.");
  }

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts }],
    generationConfig: {
      thinkingConfig: THINKING_CONFIG,
      ...(responseSchema && { responseMimeType: "application/json", responseSchema }),
    },
  });
  const started = performance.now();
  const log = (outcome: string) =>
    console.log(
      `[gemini] ${label}: ${outcome} | ${GEMINI_MODEL} | request ${kb(Buffer.byteLength(requestBody))}` +
        ` | ${((performance.now() - started) / 1000).toFixed(2)}s`,
    );

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: requestBody,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    log(timedOut ? "timed out" : "network error");
    throw new GeminiError(
      timedOut ? "Gemini took too long to respond. Please try again." : "Couldn't reach Gemini. Please try again.",
    );
  }

  const body = await response.json().catch(() => null);
  log(
    response.ok
      ? `ok, ${body?.usageMetadata?.thoughtsTokenCount ?? 0} thinking tokens`
      : `HTTP ${response.status}`,
  );

  if (!response.ok) {
    // Log the details server-side; show the user something actionable.
    console.error("Gemini error", response.status, body?.error?.message);
    if (response.status === 429) {
      throw new GeminiError("Gemini rate limit reached. Wait a minute and try again.");
    }
    if (response.status === 503) {
      throw new GeminiError("Gemini is overloaded right now. Try again in a moment.");
    }
    if (response.status === 400 && /api key/i.test(body?.error?.message ?? "")) {
      throw new GeminiError("Gemini rejected the API key. Check GEMINI_API_KEY.");
    }
    if (response.status === 404) {
      throw new GeminiError(`Gemini model "${GEMINI_MODEL}" wasn't found. Check GEMINI_MODEL.`);
    }
    throw new GeminiError(`Gemini request failed (HTTP ${response.status}). Please try again.`);
  }

  if (body?.promptFeedback?.blockReason) {
    throw new GeminiError("Gemini declined to process this image. Try a different one.");
  }

  const candidate = body?.candidates?.[0];
  const text: string = (candidate?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    const reason = candidate?.finishReason;
    throw new GeminiError(
      reason === "SAFETY"
        ? "Gemini declined to process this image. Try a different one."
        : "Gemini returned an empty response. Please try again.",
    );
  }

  return { text, model: body?.modelVersion || GEMINI_MODEL };
}

// Downloads an image so it can be sent inline. Gemini can't fetch arbitrary
// URLs itself, so the server fetches the public URL and passes the bytes,
// downscaled to MAX_IMAGE_EDGE and re-encoded as JPEG (a GIF becomes its
// first frame) to keep the request small.
export async function fetchImageAsPart(url: string): Promise<Part> {
  const started = performance.now();
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
  } catch {
    throw new GeminiError("Couldn't download the image to send to Gemini.");
  }
  const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (!response.ok || !mimeType.startsWith("image/")) {
    throw new GeminiError("Couldn't download the image to send to Gemini.");
  }
  const original = Buffer.from(await response.arrayBuffer());
  const downloaded = performance.now();

  let resized: { data: Buffer; info: OutputInfo };
  try {
    resized = await sharp(original)
      .rotate() // apply EXIF orientation before the metadata is dropped
      .resize(MAX_IMAGE_EDGE, MAX_IMAGE_EDGE, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }) // JPEG has no transparency
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new GeminiError("Couldn't read that image. Try a PNG, JPEG, WebP or GIF.");
  }

  console.log(
    `[gemini] image: ${kb(original.length)} ${mimeType} → ${kb(resized.data.length)} JPEG ` +
      `${resized.info.width}×${resized.info.height} | download ${((downloaded - started) / 1000).toFixed(2)}s` +
      ` | resize ${((performance.now() - downloaded) / 1000).toFixed(2)}s`,
  );

  return { inlineData: { mimeType: "image/jpeg", data: resized.data.toString("base64") } };
}
