'use server';
/**
 * @fileOverview A virtual try-on AI agent.
 *
 * - runVirtualTryOn - A function that handles the virtual try-on process.
 * - VirtualTryOnInput - The input type for the runVirtualTryOn function.
 * - VirtualTryOnOutput - The return type for the runVirtualTryOn function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VirtualTryOnInputSchema = z.object({
  userPhotoDataUri: z
    .string()
    .describe(
      "A photo of the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  clothingPhotoDataUri: z
    .string()
    .describe(
      "A photo of the clothing item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type VirtualTryOnInput = z.infer<typeof VirtualTryOnInputSchema>;

const VirtualTryOnOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated image of the user wearing the clothing, as a data URI."
    ),
});
export type VirtualTryOnOutput = z.infer<typeof VirtualTryOnOutputSchema>;

export async function runVirtualTryOn(input: VirtualTryOnInput): Promise<VirtualTryOnOutput> {
  return virtualTryOnFlow(input);
}

const virtualTryOnFlow = ai.defineFlow(
  {
    name: 'virtualTryOnFlow',
    inputSchema: VirtualTryOnInputSchema,
    outputSchema: VirtualTryOnOutputSchema,
  },
  async ({userPhotoDataUri, clothingPhotoDataUri}) => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-3-pro-image-preview',
      prompt: [
        {media: {url: userPhotoDataUri}},
        {media: {url: clothingPhotoDataUri}},
        {
          text: 'Take the clothing item from the second image and place it realistically on the person in the first image. The person should be clearly visible wearing the clothing. The background should be clean and simple, like a studio photo. The final image should only contain the person wearing the new clothing.',
        },
      ],
      config: {
        // Must provide both TEXT and IMAGE, IMAGE only won't work
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed.');
    }

    return {imageDataUri: media.url};
  }
);
