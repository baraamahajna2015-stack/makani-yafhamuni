/**
 * OpenAI Vision validation layer — runs after COCO-SSD filtering.
 * Sends the original image + detected labels to Vision for intelligent validation:
 * removes unrealistic detections, corrects misclassifications, keeps only
 * realistically visible objects. Does NOT fabricate objects.
 * API key is read from process.env.OPENAI_API_KEY (server-side only).
 */

const OPENAI_VISION_MODEL = 'gpt-4o';

const SYSTEM_PROMPT = `You are a strict validator for object detection results. You will receive an image and a list of object labels that a detector reported. Your task is to return ONLY the labels that are realistically and clearly visible in the image.

Rules:
- REMOVE labels that are false positives (e.g. umbrella, laptop, or other objects that do not actually appear in the scene).
- You MAY correct a label if the detector misclassified (e.g. "cell phone" when it is clearly a remote) by returning the correct object type that is visible.
- Keep ONLY objects that are plausibly and visibly present in the image.
- Do NOT add or invent any object that was not in the provided list. You may only return a subset of the given labels or corrected versions of them.
- Return a JSON array of strings: the validated object labels, in order of relevance. Example: ["chair", "table", "book"].
- Output nothing else: no explanation, no markdown, only the JSON array.`;

function getImageMimeType(buffer: Buffer): string {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e) return 'image/png';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/webp';
  return 'image/jpeg';
}

/**
 * Validates detected labels against the actual image using OpenAI Vision.
 * Returns a subset/corrected list of labels. Does not fabricate; may return fewer than input.
 * If API key is missing or the request fails, returns the original labels unchanged.
 */
export async function validateWithVision(
  imageBuffer: Buffer,
  detectedLabels: string[]
): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    return detectedLabels;
  }

  if (!detectedLabels.length) {
    return detectedLabels;
  }

  const base64 = imageBuffer.toString('base64');
  const mime = getImageMimeType(imageBuffer);
  const imageUrl = `data:${mime};base64,${base64}`;

  const userContent = `Detected labels to validate (return only those realistically visible; correct misclassifications if needed; do not add new objects):\n${JSON.stringify(detectedLabels)}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_VISION_MODEL,
        max_tokens: 500,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userContent },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[vision-validation] OpenAI API error:', response.status, errText);
      return detectedLabels;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return detectedLabels;
    }

    // Parse JSON array: allow optional surrounding whitespace/markdown
    const cleaned = content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(parsed)) {
      return detectedLabels;
    }

    const validated = parsed.filter((x): x is string => typeof x === 'string');
    return validated.length > 0 ? validated : detectedLabels;
  } catch (err) {
    console.error('[vision-validation] Error:', err);
    return detectedLabels;
  }
}
