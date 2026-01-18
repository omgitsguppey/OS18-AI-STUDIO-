
import { Type } from "@google/genai";
import { generateOptimizedContent, APP_MODEL_CONFIG, getAIClient } from "./core";
import { AppID } from "../../types";
import { LocalIntelligence } from "../localIntelligence";

// --- LYRICS AI ---

export interface LyricAnalysis {
  songTitle: string;
  originalLyrics?: string;
  vocabularyComplexity: number; 
  metaphoricDensity: number;
  emotionalResonance: number;
  structuralInnovation: number;
  rhythmicSophistication: number;
  linguisticSignature: string;
  detailedBreakdown: {
    vocabulary: string;
    metaphors: string;
    emotion: string;
    structure: string;
    rhythm: string;
  };
  keyMetaphors: string[];
  timestamp?: number;
}

export interface ArtistProfileAnalysis {
  coreThemes: string[];
  vocabularyEvolution: string;
  emotionalArc: string;
  signatureStyle: string;
  suggestedCreativeDirection: string;
}

export const analyzeLyrics = async (songTitle: string, lyrics: string): Promise<LyricAnalysis> => {
  // 1. Calculate local metrics first
  const localStats = LocalIntelligence.analyzeText(lyrics);

  // 2. Query AI for subjective analysis only
  const prompt = `Perform a high-level linguistic audit for the song "${songTitle}". 
  Lyrics: ${lyrics}

  Provide evaluation for:
  1. Metaphoric Density (1-100)
  2. Emotional Resonance (1-100)
  3. Linguistic Signature (short phrase describing the style)
  4. Detailed text breakdown for 5 categories (Vocab, Metaphor, Emotion, Structure, Rhythm).
  5. Key Metaphors list.
  `;

  const response = await generateOptimizedContent(
    AppID.LYRICS_AI,
    prompt,
    {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          songTitle: { type: Type.STRING },
          metaphoricDensity: { type: Type.NUMBER },
          emotionalResonance: { type: Type.NUMBER },
          linguisticSignature: { type: Type.STRING },
          detailedBreakdown: {
            type: Type.OBJECT,
            properties: {
              vocabulary: { type: Type.STRING },
              metaphors: { type: Type.STRING },
              emotion: { type: Type.STRING },
              structure: { type: Type.STRING },
              rhythm: { type: Type.STRING }
            },
            required: ["vocabulary", "metaphors", "emotion", "structure", "rhythm"]
          },
          keyMetaphors: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: [
          "songTitle", "metaphoricDensity", "emotionalResonance", 
          "linguisticSignature", "detailedBreakdown", "keyMetaphors"
        ]
      }
    }
  );

  const aiResult = JSON.parse(response.text || '{}');
  
  // 3. Merge Local Stats with AI Result
  return { 
    ...aiResult, 
    vocabularyComplexity: localStats.vocabularyComplexity,
    rhythmicSophistication: localStats.rhythmicSophistication,
    structuralInnovation: localStats.structuralInnovation,
    originalLyrics: lyrics, 
    timestamp: Date.now() 
  };
};

export const generateArtistProfile = async (artistName: string, songs: LyricAnalysis[]): Promise<ArtistProfileAnalysis> => {
  const songSummaries = songs.map(s => 
    `Title: ${s.songTitle}. Signature: ${s.linguisticSignature}. Metaphors: ${s.keyMetaphors.join(', ')}.`
  ).join('\n');

  const prompt = `Analyze the complete lyrical body of work for artist "${artistName}".
  Based on the following song summaries, generate a holistic Artist Profile:
  ${songSummaries}
  
  Identify core recurring themes, how their vocabulary has evolved, emotional arc, signature style, and suggest a creative direction.`;

  const response = await generateOptimizedContent(
    AppID.LYRICS_AI,
    prompt,
    {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          coreThemes: { type: Type.ARRAY, items: { type: Type.STRING } },
          vocabularyEvolution: { type: Type.STRING },
          emotionalArc: { type: Type.STRING },
          signatureStyle: { type: Type.STRING },
          suggestedCreativeDirection: { type: Type.STRING }
        },
        required: ['coreThemes', 'vocabularyEvolution', 'emotionalArc', 'signatureStyle', 'suggestedCreativeDirection']
      }
    }
  );

  return JSON.parse(response.text || '{}');
};

// --- CONTENT AI ---

export interface ContentEpisode {
  id: string;
  seasonId: string;
  episodeNumber: number;
  title: string;
  format: 'Short Form' | 'Mid Form' | 'Long Form';
  platform: 'YouTube' | 'TikTok' | 'Instagram';
  pov: 'First Person' | 'Second Person' | 'Third Person';
  hook: string;
  script: string;
  arcNotes: string;
  createdAt: number;
}

export interface ContentSeason {
  id: string;
  number: number;
  title: string;
  episodes: ContentEpisode[];
}

export const generateContentEpisode = async (
  seasonNumber: number,
  episodeNumber: number,
  userPrompt: string,
  contextEpisodes: ContentEpisode[],
  format: string = 'Short Form',
  pov: string = 'First Person'
): Promise<Omit<ContentEpisode, 'id' | 'createdAt' | 'seasonId'>> => {
  const contextSummary = contextEpisodes.slice(-3).map((ep, i) => 
    `Ep ${ep.episodeNumber}: ${ep.title} (${ep.format}) - Arc: ${ep.arcNotes}`
  ).join('\n');

  const povInstruction = pov === 'First Person' ? 'Use "I", "Me", "My".' : 
                         pov === 'Second Person' ? 'Use "You", "Your".' : 
                         'Use "They", "It".';

  const systemInstruction = `You are the Showrunner. Write a FULL PRODUCTION SCRIPT for Season ${seasonNumber}, Episode ${episodeNumber}.
  Format: ${format}. POV: ${pov}.
  Context: ${contextSummary || "Season Premiere."}
  Tone: "Gen-Z Professional", high stakes.`;

  const prompt = `Idea: "${userPrompt}". ${povInstruction}`;

  const response = await generateOptimizedContent(
    AppID.CONTENT_AI,
    prompt,
    {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          format: { type: Type.STRING, enum: ['Short Form', 'Mid Form', 'Long Form'] },
          platform: { type: Type.STRING, enum: ['YouTube', 'TikTok', 'Instagram'] },
          pov: { type: Type.STRING, enum: ['First Person', 'Second Person', 'Third Person'] },
          hook: { type: Type.STRING },
          script: { type: Type.STRING },
          arcNotes: { type: Type.STRING },
          episodeNumber: { type: Type.INTEGER }
        },
        required: ['title', 'format', 'platform', 'pov', 'hook', 'script', 'arcNotes']
      }
    }
  );

  return JSON.parse(response.text || '{}');
};

export const generateSeasonTitle = async (episodes: ContentEpisode[]): Promise<string> => {
  const summary = episodes.map(e => e.title + ": " + e.hook).join('\n');
  const prompt = `Based on these episode hooks, generate a short 3-5 word Title for this Season.
  Episodes: ${summary}`;

  const response = await generateOptimizedContent(
    AppID.CONTENT_AI,
    prompt,
    {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          seasonTitle: { type: Type.STRING }
        }
      }
    }
  );

  return JSON.parse(response.text || '{}').seasonTitle || "New Season";
};

// --- WALLPAPER AI ---

export const generateWallpaper = async (
  prompt: string,
  style: string,
  resolution: "1K" | "2K" | "4K",
  aspectRatio: "9:16" | "16:9" | "1:1"
): Promise<string | null> => {
  const ai = getAIClient();
  const fullPrompt = `Style: ${style}. ${prompt}. High quality wallpaper.`;
  
  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.WALLPAPER_AI],
    contents: { parts: [{ text: fullPrompt }] },
    config: {
      imageConfig: { aspectRatio: aspectRatio, imageSize: resolution }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return part.inlineData.data;
  }
  return null;
};
