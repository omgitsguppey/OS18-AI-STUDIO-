
import { Type } from "@google/genai";
import { generateOptimizedContent, APP_MODEL_CONFIG } from "./core";
import { AppID } from "../../types";

const TOPICS = [
  "Foreign Cars", "Trust Issues", "Expensive Fabrics", "The Past", 
  "Betrayal", "Heavy Jewelry", "Global Travel", "Architecture", 
  "Fine Dining", "Isolation", "Empire Building", "Nightmares",
  "Penthouse Views", "Silence", "Cold Weather"
];

export const generateTrapBar = async (
  likedLines: string[], 
  dislikedLines: string[],
  vibe: string = "Flex"
): Promise<string> => {
  const randomTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  
  const systemInstruction = `You are a platinum-selling Trap Music Ghostwriter.
  Your specialty is "One Liners" - short, punchy bars that capture a specific mood.
  
  Current Vibe: ${vibe.toUpperCase()}
  Focus Topic: ${randomTopic}
  
  Style Guide:
  - Concise (1-2 lines max).
  - Use modern slang but keep it timeless.
  - Don't rhyme for the sake of rhyming; focus on the impact.
  - If "Flex": Reference specific brands (Rick Owens, Maybach, AP, Bottega), assets, and exclusivity.
  - If "Dark": Focus on enemies, paranoia, silence, Gotham energy, and shadows.
  - If "Pain": Focus on loss, numbness, fake love, and the cost of success.
  - If "Hype": Focus on energy, dominance, club atmosphere, and speed.
  
  Feedback Loop:
  ${likedLines.length > 0 ? `Users LIKED these lines (Do more like this): ${JSON.stringify(likedLines.slice(-5))}` : ''}
  ${dislikedLines.length > 0 ? `Users DISLIKED these lines (Avoid this style): ${JSON.stringify(dislikedLines.slice(-5))}` : ''}
  `;

  const response = await generateOptimizedContent(
    AppID.TRAP_AI,
    `Spit a bar about ${randomTopic} with a ${vibe} feeling.`,
    {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bar: { type: Type.STRING }
        }
      }
    }
  );
  
  return JSON.parse(response.text || '{}').bar || "Walked in the bank, I'm the owner.";
};
