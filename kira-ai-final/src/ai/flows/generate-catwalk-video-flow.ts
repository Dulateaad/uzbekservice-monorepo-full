'use server';
/**
 * @fileOverview A flow for generating a catwalk video from an image using Veo.
 *
 * - generateCatwalkVideo - A function that takes an image and generates a video.
 * - GenerateCatwalkVideoInput - The input type for the generateCatwalkVideo function.
 * - GenerateCatwalkVideoOutput - The return type for the generateCatwalkVideo function.
 */
import { googleAI } from '@genkit-ai/google-genai';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateCatwalkVideoInputSchema = z.object({
  imageDataUri: z.string().describe(
    "A photo of a person wearing an outfit, as a data URI."
  ),
});
export type GenerateCatwalkVideoInput = z.infer<typeof GenerateCatwalkVideoInputSchema>;

const GenerateCatwalkVideoOutputSchema = z.object({
  videoDataUri: z.string().describe(
    "The generated video as a data URI."
  ),
});
export type GenerateCatwalkVideoOutput = z.infer<typeof GenerateCatwalkVideoOutputSchema>;


export async function generateCatwalkVideo(
  input: GenerateCatwalkVideoInput
): Promise<GenerateCatwalkVideoOutput> {
  return generateCatwalkVideoFlow(input);
}


const generateCatwalkVideoFlow = ai.defineFlow(
  {
    name: 'generateCatwalkVideoFlow',
    inputSchema: GenerateCatwalkVideoInputSchema,
    outputSchema: GenerateCatwalkVideoOutputSchema,
  },
  async ({ imageDataUri }) => {
      let { operation } = await ai.generate({
        model: googleAI.model('veo-2.0-generate-001'),
        prompt: [
            {
                text: 'Animate the person in this image. Make them walk down a fashion show catwalk as if they are a model. The background should be a typical fashion show runway. The video should be cinematic and high-quality.',
            },
            {
                media: {
                    contentType: 'image/jpeg', // The virtual try-on returns jpeg
                    url: imageDataUri,
                },
            },
        ],
        config: {
            durationSeconds: 5,
            aspectRatio: '9:16', // Portrait aspect ratio matching the try-on image
            personGeneration: 'allow_adult',
        },
    });

    if (!operation) {
        throw new Error('Expected the model to return an operation');
    }

    // Wait for the operation to complete
    let finalOperation = operation;
    while (!finalOperation.done) {
        // The Veo model can take a minute or more to generate video.
        // We need to poll the operation status.
        await new Promise((resolve) => setTimeout(resolve, 5000)); // wait 5 seconds
        finalOperation = await ai.checkOperation(finalOperation);
    }

    if (finalOperation.error) {
        throw new Error(`Failed to generate video: ${finalOperation.error.message}`);
    }

    const videoPart = finalOperation.output?.message?.content.find((p) => !!p.media);

    if (!videoPart?.media?.url) {
        throw new Error('Failed to find the generated video in the operation result.');
    }
    
    // The URL from Veo is temporary and requires the API key to download.
    // We must fetch it on the server and convert to a data URI to send to the client.
    const videoDownloadResponse = await fetch(
        `${videoPart.media.url}&key=${process.env.GEMINI_API_KEY}`
    );

    if (!videoDownloadResponse.ok || !videoDownloadResponse.body) {
        throw new Error(`Failed to download generated video. Status: ${videoDownloadResponse.status}`);
    }

    const videoBuffer = await videoDownloadResponse.arrayBuffer();
    const base64Video = Buffer.from(videoBuffer).toString('base64');
    
    return {
        videoDataUri: `data:video/mp4;base64,${base64Video}`,
    };
  }
);
