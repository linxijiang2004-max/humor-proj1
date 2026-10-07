// Smoke test: does Gemini answer a text-only prompt at all, and how fast?
// Isolates the API key / model / network from our image handling.
//
//   node scripts/test-gemini.mjs [--runs=3] [--gap=15] [--thinking=default|minimal|low|budget0] [--model=...]
//
// --gap is seconds between runs; the free tier allows 5 requests/minute/model.
//
// Uses the same endpoint as lib/gemini.ts. The model defaults to GEMINI_MODEL
// from .env.local.

import { readFileSync } from "node:fs";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const TIMEOUT_MS = 30_000;
const PROMPT = "Say hello in 5 words";

// generationConfig.thinkingConfig for each --thinking mode.
const THINKING = {
  default: undefined,
  minimal: { thinkingLevel: "minimal" },
  low: { thinkingLevel: "low" },
  budget0: { thinkingBudget: 0 },
};

// Minimal .env parser: KEY=value lines, optional quotes, # comments.
function readEnvFile(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return env;
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")),
);
const env = readEnvFile(new URL("../.env.local", import.meta.url));
const apiKey = env.GEMINI_API_KEY;
const model = args.model || env.GEMINI_MODEL || "gemini-flash-latest";
const runs = Number(args.runs ?? 1);
const thinkingMode = args.thinking ?? "default";
const gapMs = Number(args.gap ?? 0) * 1000;

if (!apiKey) {
  console.error("GEMINI_API_KEY is missing or empty in .env.local");
  process.exit(1);
}
if (!(thinkingMode in THINKING)) {
  console.error(`Unknown --thinking=${thinkingMode}. Use one of: ${Object.keys(THINKING).join(", ")}`);
  process.exit(1);
}

console.log(`Model requested: ${model}`);
console.log(`API key:         ${apiKey.slice(0, 4)}…${apiKey.slice(-4)} (${apiKey.length} chars)`);
console.log(`Thinking:        ${thinkingMode} ${JSON.stringify(THINKING[thinkingMode] ?? {})}`);
console.log(`Prompt:          ${PROMPT}\n`);

let failures = 0;

for (let run = 1; run <= runs; run++) {
  if (run > 1 && gapMs) await new Promise((resolve) => setTimeout(resolve, gapMs));
  const started = performance.now();
  const elapsed = () => `${((performance.now() - started) / 1000).toFixed(2)}s`;
  const label = runs > 1 ? `[run ${run}/${runs}] ` : "";

  try {
    const thinkingConfig = THINKING[thinkingMode];
    const response = await fetch(`${API_BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: PROMPT }] }],
        generationConfig: thinkingConfig ? { thinkingConfig } : undefined,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      failures++;
      console.error(`${label}FAILED: HTTP ${response.status} ${response.statusText} after ${elapsed()}`);
      console.error(JSON.stringify(body, null, 2));
      continue;
    }

    const text = (body?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    const usage = body?.usageMetadata ?? {};
    console.log(
      `${label}OK ${elapsed()} | model ${body?.modelVersion ?? "?"} | thinking tokens ${usage.thoughtsTokenCount ?? 0}` +
        ` | output tokens ${usage.candidatesTokenCount ?? "?"} | finish ${body?.candidates?.[0]?.finishReason ?? "?"}` +
        ` | ${JSON.stringify(text || "(empty)")}`,
    );
  } catch (error) {
    failures++;
    console.error(`${label}FAILED: request threw after ${elapsed()}`);
    console.error(error);
    if (error?.cause) console.error("cause:", error.cause);
  }
}

process.exit(failures ? 1 : 0);
