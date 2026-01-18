
import { getAIClient, APP_MODEL_CONFIG, fileToBase64 } from "./core";
import { AppID } from "../../types";
import { LocalIntelligence } from "../localIntelligence";

export interface Achievement {
  id: string;
  artistName: string;
  songTitle: string;
  streamCount: string;
  style: string;
  imageBase64: string;
  timestamp: number;
}

export const generateMilestoneImage = async (
  artistName: string,
  songTitle: string,
  streamCount: string,
  style: string,
  coverArtFile?: File
): Promise<string | null> => {
  const ai = getAIClient();

  // Scenario A: Editing existing cover art (Gemini Nano/Flash Image)
  if (coverArtFile) {
    const base64Data = await fileToBase64(coverArtFile);
    const prompt = `Overlay text "${streamCount} STREAMS" on this cover art. Stylish font.`;

    const response = await ai.models.generateContent({
      model: APP_MODEL_CONFIG['achievements_edit'],
      contents: {
        parts: [
          { inlineData: { mimeType: coverArtFile.type, data: base64Data } },
          { text: prompt }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return part.inlineData.data;
    }
    return null;
  }

  // Scenario B: Procedural SVG Generation (Zero Cost, Instant)
  return LocalIntelligence.generateAwardSVG(artistName, songTitle, streamCount, style);
};
