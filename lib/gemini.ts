import "server-only";

// Minimal Gemini REST client. Server-only: GEMINI_API_KEY must never reach
// the browser, so this module fails the build if a Client Component imports it.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 45_000;

// Override with GEMINI_MODEL in .env.local / Vercel if you want a pinned model.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

// Thrown for any Gemini failure. `message` is safe to show to the user.
export class GeminiError extends Error {}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

type GenerateOptions = {
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

export async function generate({ parts, responseSchema }: GenerateOptions): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("Caption generation isn't configured: GEMINI_API_KEY is missing on the server.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: responseSchema
          ? { responseMimeType: "application/json", responseSchema }
          : undefined,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    throw new GeminiError(
      timedOut ? "Gemini took too long to respond. Please try again." : "Couldn't reach Gemini. Please try again.",
    );
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    // Log the details server-side; show the user something actionable.
    console.error("Gemini error", response.status, body?.error?.message);
    if (response.status === 429) {
      throw new GeminiError("Gemini rate limit reached. Wait a minute and try again.");
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
// URLs itself, so the server fetches the public URL and passes the bytes.
export async function fetchImageAsPart(url: string): Promise<Part> {
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
  const data = Buffer.from(await response.arrayBuffer()).toString("base64");
  return { inlineData: { mimeType, data } };
}
