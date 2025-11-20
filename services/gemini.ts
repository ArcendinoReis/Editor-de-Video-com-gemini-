import { GoogleGenAI, Modality, Type } from "@google/genai";
import { base64ToPCM, pcmToWav } from '../utils/audioUtils';
import { ImageStyle } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Helper to retry operations on 429 errors with exponential backoff and jitter
 */
const retryOperation = async <T>(operation: () => Promise<T>, maxRetries = 5, initialDelay = 3000): Promise<T> => {
    let delay = initialDelay;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            const msg = error?.message || '';
            const status = error?.status || error?.error?.code;
            
            // Check for various rate limit indicators
            const isRateLimit = 
                status === 429 || 
                msg.includes('429') || 
                msg.includes('quota') || 
                msg.includes('RESOURCE_EXHAUSTED') ||
                msg.includes('rate limit');
            
            const isLastAttempt = i === maxRetries - 1;
            
            if (isRateLimit && !isLastAttempt) {
                // Add jitter (0-1000ms) to avoid thundering herd
                const jitter = Math.random() * 1000;
                const waitTime = delay + jitter;
                
                console.warn(`Rate limit hit. Retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                
                delay *= 1.5; // Exponential backoff
                continue;
            }
            throw error;
        }
    }
    throw new Error("Operation failed after retries");
};

/**
 * Generates a script broken into scenes based on a topic and desired duration.
 */
export const generateScript = async (topic: string, durationMinutes: number) => {
  const estimatedScenes = Math.max(3, Math.ceil(durationMinutes * 6));

  return retryOperation(async () => {
    try {
        const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Write a video script about "${topic}". 
        The video should be approximately ${durationMinutes} minutes long.
        Divide it into exactly ${estimatedScenes} scenes. 
        Each scene must have a "narration" (the spoken text) and a "visualPrompt" (a detailed description of the image to generate for this scene).
        Return ONLY a JSON array.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                narration: { type: Type.STRING },
                visualPrompt: { type: Type.STRING }
                },
                required: ["narration", "visualPrompt"]
            }
            }
        }
        });
        
        if (response.text) {
        return JSON.parse(response.text);
        }
        throw new Error("No text returned from Gemini");
    } catch (error) {
        console.error("Error generating script:", error);
        throw error;
    }
  }, 3, 2000); // Keep script generation retries lower as it's a single call
};

/**
 * Takes raw text input and formats it into scenes with visual prompts.
 */
export const formatScript = async (text: string) => {
    return retryOperation(async () => {
        try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following raw text and split it into logical video scenes.
            For each scene, provide the "narration" (the text exactly as written in that part) and generate a creative "visualPrompt" (in English) that describes an image to match that narration.
            
            Raw Text:
            "${text}"
            
            Return ONLY a JSON array.`,
            config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                type: Type.OBJECT,
                properties: {
                    narration: { type: Type.STRING },
                    visualPrompt: { type: Type.STRING }
                },
                required: ["narration", "visualPrompt"]
                }
            }
            }
        });
        
        if (response.text) {
            return JSON.parse(response.text);
        }
        throw new Error("No text returned from Gemini");
        } catch (error) {
        console.error("Error formatting script:", error);
        throw error;
        }
    }, 3, 2000);
  };

/**
 * Generates an image for a scene using Imagen 4 with a specific style.
 */
export const generateImage = async (prompt: string, aspectRatio: '16:9' | '9:16' | '1:1' = '16:9', style: ImageStyle = ImageStyle.CINEMATIC) => {
  // Increased retries for images (5) and longer initial delay (4s)
  return retryOperation(async () => {
    try {
        const stylePrompt = `Style: ${style}. ${prompt}, 4k, high quality, detailed`;
    
        // Using Imagen 4 for high quality as requested
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: stylePrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: aspectRatio,
                outputMimeType: 'image/jpeg'
            }
        });
    
        const base64Image = response.generatedImages?.[0]?.image?.imageBytes;
        if (base64Image) {
            return `data:image/jpeg;base64,${base64Image}`;
        }
        throw new Error("No image returned");
      } catch (error) {
        console.error("Imagen error, falling back to Flash-Image:", error);
        
        // Fallback to Nano Banana (Flash Image)
        // We simply await it. If it fails with 429, the outer retryOperation will catch it 
        // and retry the whole process (try Imagen -> fail -> try Flash)
        return generateImageFallback(prompt + `, ${style} style`);
      }
  }, 5, 4000); 
};

const generateImageFallback = async (prompt: string) => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                responseModalities: [Modality.IMAGE]
            }
        });
        
        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part && part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
        throw new Error("Fallback image generation failed");
    } catch (e) {
        // Let the outer retry handle it
        throw e;
    }
}

/**
 * Generates speech for a narration text.
 */
export const generateSpeech = async (text: string, voiceName: string = 'Puck') => {
  // Audio usually has reasonable limits, but we protect it too
  return retryOperation(async () => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: {
                parts: [{ text }]
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName }
                    }
                }
            }
        });
    
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        if (base64Audio) {
            const pcmData = base64ToPCM(base64Audio);
            const wavBlob = pcmToWav(pcmData, 24000); // 24kHz is standard for this model
            return URL.createObjectURL(wavBlob);
        }
        throw new Error("No audio returned");
    
      } catch (error) {
        console.error("Error generating speech:", error);
        throw error;
      }
  }, 5, 3000);
};