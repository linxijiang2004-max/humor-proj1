// The exact prompt text sent to Gemini. Whatever these return is also what
// gets stored in caption_request_steps.prompt.

export const DESCRIBE_PROMPT = `Look at this image.
Describe it the way a college student would read it:
- What is literally happening
- The emotional reaction it conveys — be specific, not just "happy" or "sad"
- What situation would a student post this as a reaction to
If the emotion is genuinely ambiguous, say so explicitly rather than guessing.`;

export function captionPrompt(description: string) {
  return `Here is a description of an image:
${description}

Write 4 short captions a Columbia/Barnard student would find funny.

Rules:
- Each caption takes a DIFFERENT angle. Two captions about the same joke is a fail.
- Specific beats generic. Reference actual student experience.
- No puns.
- Under 15 words each.

Return JSON: {"captions": ["...", "...", "...", "..."]}`;
}

export const CAPTION_COUNT = 4;
