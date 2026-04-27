
'use server';
/**
 * @fileOverview A flow for generating trend-based videos from an image using Veo.
 *
 * - generateTrendVideo - A function that takes an image and a theme to generate a video.
 */
import { googleAI } from '@genkit-ai/google-genai';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTrendVideoInputSchema = z.object({
  imageDataUri: z.string().describe("A photo of a person, as a data URI."),
  theme: z.enum(['bridgerton', 'f1']).describe("The selected trend theme."),
});
export type GenerateTrendVideoInput = z.infer<typeof GenerateTrendVideoInputSchema>;

const GenerateTrendVideoOutputSchema = z.object({
  videoDataUri: z.string().describe("The generated video as a data URI."),
});
export type GenerateTrendVideoOutput = z.infer<typeof GenerateTrendVideoOutputSchema>;

const F1_PROMPT = "A professional Formula 1 driver standing confidently in the pit lane, holding a racing helmet in one hand at his side. The character must preserve the exact facial features, proportions, body shape and height of the original person, realistic human anatomy, no exaggeration, no stylization. Authentic racing suit with sponsor patches, detailed stitching and fabric texture. Modern Formula 1 car behind him. Warm sunset lighting, cinematic golden hour, shallow depth of field, ultra realistic skin texture, natural facial expression, subtle breathing movement. Camera slowly pushes in, premium sports documentary style, IMAX quality, 8K detail, photorealistic, high production value.";

const BRIDGERTON_PROMPT = `A cinematic, romantic Regency-era masquerade scene in a secluded moonlit garden pavilion. The subject is a young noblewoman at a twilight ball, wearing an empire-waist gown with a high waistline under the bust, soft butterfly puff sleeves, delicate embroidery, and a gentle shimmer in the fabric (silk or satin with subtle metallic thread). Color palette: pearl white, soft silver, pale lavender, misty blue, with small warm highlights in champagne gold jewelry.

She wears an ornate masquerade half-mask (lace and pearl beading, silver filigree details), elegant opera gloves, and minimal refined accessories: pearl drop earrings, a thin necklace, and a small cameo pendant. Hairstyle: classic Regency updo or half-up style with soft curls, ribbon ties, and a few delicate hair ornaments (pearls). Makeup is natural, luminous skin, soft rosy cheeks, calm lips, subtle highlight.

Environment: a stone terrace with a romantic garden pavilion and arches. Overhead, cascading wisteria-like flowers and greenery. In the distance, hints of a grand estate and lanterns. Background is softly blurred, dreamy bokeh, low detail, no sharp text or signage.

Atmosphere: mysterious, intimate, enchanted. Gentle drifting mist, floating dust motes catching light. Very light breeze moving ribbon ends and a few strands of hair.

Lighting: soft moonlight as the key light, plus warm candle lantern rim lights. High-end cinematic lighting, smooth skin tones, no harsh shadows. Subtle glow, not neon. Filmic color grading, airy highlights, clean whites, soft lavender shadows.

Camera + motion: medium shot to full-body feel (even if face-based), slow elegant movement. The subject turns slightly toward camera, then looks away with a calm confident expression. A subtle “ballroom moment” gesture: one hand adjusts the mask or holds a delicate fan, then a slow graceful step forward. Camera performs a gentle dolly-in and slight orbit, stabilized, shallow depth of field, 35mm look, soft focus background.

Style references: romantic period drama, couture-level costume design, luxurious editorial cinematography, museum-like authenticity with a magical twist. Output requirements: photorealistic, identity-preserving face, highly detailed fabric texture, realistic hands, no distortions, no extra limbs, no warped jewelry. Background remains out of focus. 4K detail, cinematic motion, smooth transitions.`;

const NEGATIVE_PROMPT = "low quality, cartoon, anime, CGI look, plastic skin, over-sharpening, heavy neon glow, harsh purple tint, muddy whites, distorted face, changed identity, asymmetrical eyes, extra fingers, missing fingers, deformed hands, extra limbs, warped mask, melted jewelry, text, logos, watermark, modern clothing, modern makeup, modern architecture, street signs, sharp background, noisy grain.";

export async function generateTrendVideo(input: GenerateTrendVideoInput): Promise<GenerateTrendVideoOutput> {
  return generateTrendVideoFlow(input);
}

const generateTrendVideoFlow = ai.defineFlow(
  {
    name: 'generateTrendVideoFlow',
    inputSchema: GenerateTrendVideoInputSchema,
    outputSchema: GenerateTrendVideoOutputSchema,
  },
  async ({ imageDataUri, theme }) => {
    const promptText = theme === 'f1' ? F1_PROMPT : BRIDGERTON_PROMPT;

    let { operation } = await ai.generate({
      model: googleAI.model('veo-2.0-generate-001'),
      prompt: [
        { text: promptText },
        { media: { contentType: 'image/jpeg', url: imageDataUri } },
      ],
      config: {
        durationSeconds: 6,
        aspectRatio: '9:16',
        personGeneration: 'allow_adult',
        negativePrompt: NEGATIVE_PROMPT,
      },
    });

    if (!operation) throw new Error('Expected the model to return an operation');

    let finalOperation = operation;
    while (!finalOperation.done) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      finalOperation = await ai.checkOperation(finalOperation);
    }

    if (finalOperation.error) throw new Error(`Failed to generate video: ${finalOperation.error.message}`);

    const videoPart = finalOperation.output?.message?.content.find((p) => !!p.media);
    if (!videoPart?.media?.url) throw new Error('Failed to find video in result.');

    const videoDownloadResponse = await fetch(`${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}`);
    if (!videoDownloadResponse.ok || !videoDownloadResponse.body) throw new Error('Failed to download video.');

    const videoBuffer = await videoDownloadResponse.arrayBuffer();
    const base64Video = Buffer.from(videoBuffer).toString('base64');

    return { videoDataUri: `data:video/mp4;base64,${base64Video}` };
  }
);
