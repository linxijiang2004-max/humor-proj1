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

How caption and image work together: the caption sits ABOVE the image and is
read first. It states a student situation as a standalone line. Then the reader
sees the image, and the image is the reaction to that situation: its mood,
posture or energy is the punchline. The caption is the setup; the image lands it.

Start from the description's emotional reaction and the situation a student
would post this image in response to. Each caption names one such situation.

Bad (describes the image): "A pug wrapped in a blanket, fully committed to doing nothing today."
Bad (ignores the image): a joke whose punchline has nothing to do with the image's
mood, so it would work equally well under any picture.
Good (image: a pug swaddled in a blanket, withdrawn and unbothered):
"Finding community now requires committee approval."
The line is a complete joke on its own, and the pug's retreat into the blanket
is the reaction to it.

Test every caption: is it funnier above THIS image than above a random one?
If not, rewrite it.

Rules:
- Don't describe, narrate or point at the image ("this dog", "me when", "a dragonfly that...").
- Never mention any object, animal, food or person that appears in the image,
  not even indirectly. The image supplies those; the caption supplies the situation.
- Each caption takes a DIFFERENT angle. Two captions about the same joke is a fail.
- Specific beats generic. Reference actual student experience.
- No puns.
- Under 15 words each.

Return JSON: {"captions": ["...", "...", "...", "..."]}`;
}

export const CAPTION_COUNT = 4;
