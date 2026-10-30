import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DESCRIBE_PROMPT, captionPrompt } from "./caption-prompts";
import { GEMINI_MODEL, GeminiError } from "./gemini";

// Turns the chain config the admin console manages (prompt_chains, steps,
// mix, llm_models, terms, generation_examples) into the steps generateCaptions
// runs. The config is read through the get_caption_chain() RPC, because the
// tables themselves are superadmin-only.
//
// How a chain runs:
// - Steps run in step_index order. The FIRST step is the describe step: it
//   gets the image, its output is the image description, and it is skipped
//   when images.description is already cached. The LAST step is the caption
//   step: it must return {"captions": [...]}. Steps in between get text only.
// - A chain needs at least two steps; otherwise the hard-coded prompts are used.
// - Placeholders, filled in any step's prompt_template (unknown ones are left
//   as written):
//     {description}        the describe step's output (or the cached one)
//     {previous}           the previous step's output
//     {<step_name>}        a named earlier step's output, e.g. {describe}
//     {terms}              active terms, one "- term (category)" per line
//     {positive_examples}  generation examples marked positive
//     {negative_examples}  generation examples marked negative
// - If the caption step's template uses none of {terms}, {positive_examples}
//   or {negative_examples}, whichever of them have content are appended to
//   its prompt as labelled sections instead (see appendix()).
// - Model: the step's active model, else the active is_default model, else
//   GEMINI_MODEL. Only Google AI Studio (Gemini) models can be called; a step
//   on any other provider fails the request with a clear error.
// - If the RPC fails, or no chain is enabled, or the chain has fewer than two
//   steps, generation falls back to lib/caption-prompts.ts and GEMINI_MODEL.

type ModelRef = {
  model_string: string;
  provider: string | null;
  provider_slug: string | null;
  provider_active: boolean | null;
};

type ChainConfig = {
  chain_id: number;
  chain_name: string;
  default_model: ModelRef | null;
  steps: { step_index: number; step_name: string; prompt_template: string; model: ModelRef | null }[];
  terms: { term: string; category: string | null }[];
  examples: { input_description: string; output_caption: string; is_positive: boolean; notes: string | null }[];
};

export type PlannedStep = {
  step_index: number;
  step_name: string;
  template: string;
  model: ModelRef;
};

export type CaptionPlan = {
  // null when the hard-coded fallback is used.
  chainId: number | null;
  label: string;
  // steps[0] is the describe step, the last one the caption step.
  steps: PlannedStep[];
  // Values for {terms}, {positive_examples}, {negative_examples}.
  extras: Record<string, string>;
};

const FALLBACK_MODEL: ModelRef = {
  model_string: GEMINI_MODEL,
  provider: "Google AI Studio",
  provider_slug: null,
  provider_active: true,
};

function fallbackPlan(): CaptionPlan {
  return {
    chainId: null,
    label: "built-in prompts",
    steps: [
      { step_index: 1, step_name: "describe", template: DESCRIBE_PROMPT, model: FALLBACK_MODEL },
      { step_index: 2, step_name: "caption", template: captionPrompt("{description}"), model: FALLBACK_MODEL },
    ],
    extras: {},
  };
}

// Picks a chain (weighted by prompt_chain_mix, server-side) and plans its
// steps. Never throws: any problem reading the config means the fallback.
export async function loadCaptionPlan(supabase: SupabaseClient): Promise<CaptionPlan> {
  const { data, error } = await supabase.rpc("get_caption_chain");
  if (error) {
    console.warn("[chain] get_caption_chain failed, using built-in prompts:", error.message);
    return fallbackPlan();
  }
  const config = data as ChainConfig | null;
  if (!config) {
    console.warn("[chain] no enabled chain, using built-in prompts");
    return fallbackPlan();
  }

  const steps = (config.steps ?? [])
    .filter((s) => typeof s.prompt_template === "string" && s.prompt_template.trim())
    .sort((a, b) => a.step_index - b.step_index);
  if (steps.length < 2) {
    console.warn(`[chain] chain ${config.chain_id} has ${steps.length} usable step(s), using built-in prompts`);
    return fallbackPlan();
  }

  const defaultModel = config.default_model ?? FALLBACK_MODEL;
  const examples = config.examples ?? [];
  return {
    chainId: config.chain_id,
    label: `chain ${config.chain_id} "${config.chain_name}"`,
    steps: steps.map((s) => ({
      step_index: s.step_index,
      step_name: s.step_name,
      template: s.prompt_template,
      model: s.model ?? defaultModel,
    })),
    extras: {
      terms: (config.terms ?? [])
        .map((t) => `- ${t.term}${t.category ? ` (${t.category})` : ""}`)
        .join("\n"),
      positive_examples: formatExamples(examples.filter((e) => e.is_positive)),
      negative_examples: formatExamples(examples.filter((e) => !e.is_positive)),
    },
  };
}

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

function formatExamples(examples: ChainConfig["examples"]) {
  return examples
    .map(
      (e) =>
        `- Image: ${clip(e.input_description.replace(/\s+/g, " ").trim(), 300)}\n` +
        `  Caption: "${e.output_caption.trim()}"` +
        (e.notes?.trim() ? `\n  Note: ${e.notes.trim()}` : ""),
    )
    .join("\n");
}

// Only Gemini has a client. Anything else fails loudly instead of being
// silently swapped for a different model.
export function assertCallable(step: PlannedStep) {
  const { provider, provider_slug, provider_active, model_string } = step.model;
  const isGoogle = /google|gemini/i.test(`${provider_slug ?? ""} ${provider ?? ""}`);
  if (!isGoogle) {
    throw new GeminiError(
      `the "${step.step_name}" step uses ${model_string} on ${provider ?? "an unknown provider"}, which bit can't call yet`,
    );
  }
  if (provider_active === false) {
    throw new GeminiError(`the "${step.step_name}" step uses ${provider}, which is turned off`);
  }
}

// Single pass, so placeholder-looking text inside a value is never expanded.
export function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? values[key] : match,
  );
}

const EXTRA_KEYS = ["terms", "positive_examples", "negative_examples"] as const;

// Sections appended to the caption step's prompt when its template doesn't
// place the extras itself.
export function appendix(template: string, extras: Record<string, string>) {
  if (EXTRA_KEYS.some((k) => template.includes(`{${k}}`))) return "";
  const sections = [
    extras.terms && `Campus vocabulary you can draw on when it fits naturally (never force it):\n${extras.terms}`,
    extras.positive_examples && `Captions that landed (match their spirit, don't copy them):\n${extras.positive_examples}`,
    extras.negative_examples && `Captions that missed (avoid what they do):\n${extras.negative_examples}`,
  ].filter(Boolean);
  return sections.length ? `\n\n${sections.join("\n\n")}` : "";
}
