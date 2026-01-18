
import { Type } from "@google/genai";
import { getAIClient, APP_MODEL_CONFIG } from "./core";
import { AppID } from "../../types";
import { LocalIntelligence } from "../localIntelligence";

export interface PlaylistTrack {
  title: string;
  artist: string;
  duration: string;
  explicit: boolean;
}

export interface GeneratedPlaylist {
  id: string;
  title: string;
  description: string;
  coverImageBase64?: string;
  tracks: PlaylistTrack[];
  primaryColor: string;
  moods: string[];
  aesthetic: string;
  createdAt: number;
}

export const generatePlaylistMetadata = async (
  moods: string[],
  aesthetic: string,
  length: number,
  colorContext: string
): Promise<Omit<GeneratedPlaylist, 'id' | 'createdAt' | 'coverImageBase64'>> => {
  const ai = getAIClient();
  const prompt = `Create a playlist. Moods: ${moods.join(', ')}. Aesthetic: ${aesthetic}. Tracks: ${length}.
  Return JSON with title, description, and tracks.`;

  // Local color generation if not provided or to augment
  const generatedColors = LocalIntelligence.generatePalette(aesthetic || moods[0] || "Music");
  const primaryColor = generatedColors[0].hex;

  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.PLAYLIST_AI],
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          tracks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                artist: { type: Type.STRING },
                duration: { type: Type.STRING },
                explicit: { type: Type.BOOLEAN }
              },
              required: ['title', 'artist', 'duration', 'explicit']
            }
          }
        },
        required: ['title', 'description', 'tracks']
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  
  return {
      ...data,
      primaryColor
  };
};

export const generatePlaylistCover = async (
  title: string,
  aesthetic: string,
  color: string
): Promise<string | null> => {
  const ai = getAIClient();
  const prompt = `Album cover for playlist "${title}". Aesthetic: ${aesthetic}. Theme Color: ${color}. Minimalist 3D art.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview', 
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return part.inlineData.data;
  }
  return null;
};
