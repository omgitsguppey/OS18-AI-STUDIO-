import { Type } from "@google/genai";
import { APP_MODEL_CONFIG, generateAIContent, generateOptimizedContent } from "./core";
import { getArray, getNumber, getString, isRecord, mapStringArray, parseJsonObject } from "./parse";
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

  const aiResult = parseJsonObject(response.text);
  if (!aiResult) {
    return {
      songTitle,
      vocabularyComplexity: localStats.vocabularyComplexity,
      metaphoricDensity: 0,
      emotionalResonance: 0,
      structuralInnovation: localStats.structuralInnovation,
      rhythmicSophistication: localStats.rhythmicSophistication,
      linguisticSignature: "",
      detailedBreakdown: {
        vocabulary: "",
        metaphors: "",
        emotion: "",
        structure: "",
        rhythm: ""
      },
      keyMetaphors: [],
      originalLyrics: lyrics,
      timestamp: Date.now()
    };
  }
  const breakdown = isRecord(aiResult.detailedBreakdown) ? aiResult.detailedBreakdown : {};
  
  // 3. Merge Local Stats with AI Result
  return { 
    songTitle: getString(aiResult, "songTitle", songTitle),
    metaphoricDensity: getNumber(aiResult, "metaphoricDensity", 0),
    emotionalResonance: getNumber(aiResult, "emotionalResonance", 0),
    linguisticSignature: getString(aiResult, "linguisticSignature", ""),
    detailedBreakdown: {
      vocabulary: getString(breakdown, "vocabulary", ""),
      metaphors: getString(breakdown, "metaphors", ""),
      emotion: getString(breakdown, "emotion", ""),
      structure: getString(breakdown, "structure", ""),
      rhythm: getString(breakdown, "rhythm", "")
    },
    keyMetaphors: mapStringArray(getArray(aiResult, "keyMetaphors")),
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

  const result = parseJsonObject(response.text);
  if (!result) {
    return {
      coreThemes: [],
      vocabularyEvolution: "",
      emotionalArc: "",
      signatureStyle: "",
      suggestedCreativeDirection: ""
    };
  }
  return {
    coreThemes: mapStringArray(getArray(result, "coreThemes")),
    vocabularyEvolution: getString(result, "vocabularyEvolution", ""),
    emotionalArc: getString(result, "emotionalArc", ""),
    signatureStyle: getString(result, "signatureStyle", ""),
    suggestedCreativeDirection: getString(result, "suggestedCreativeDirection", "")
  };
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

  const result = parseJsonObject(response.text);
  if (!result) {
    return {
      title: "",
      format: "Short Form",
      platform: "YouTube",
      pov: "First Person",
      hook: "",
      script: "",
      arcNotes: "",
      episodeNumber
    };
  }
  const formatValue = getString(result, "format", "Short Form");
  const platformValue = getString(result, "platform", "YouTube");
  const povValue = getString(result, "pov", "First Person");
  return {
    title: getString(result, "title", ""),
    format: formatValue === "Mid Form" || formatValue === "Long Form" ? formatValue : "Short Form",
    platform: platformValue === "TikTok" || platformValue === "Instagram" ? platformValue : "YouTube",
    pov: povValue === "Second Person" || povValue === "Third Person" ? povValue : "First Person",
    hook: getString(result, "hook", ""),
    script: getString(result, "script", ""),
    arcNotes: getString(result, "arcNotes", ""),
    episodeNumber: getNumber(result, "episodeNumber", episodeNumber)
  };
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

  const result = parseJsonObject(response.text);
  return result ? getString(result, "seasonTitle", "New Season") : "New Season";
};

// --- IMAGE GENERATION (WALLPAPER & ALBUM ART) ---

/**
 * Generates an image using the Gemini Imagen model.
 * Base function used by specific features.
 */
export const generateWallpaper = async (
  prompt: string,
  style: string,
  resolution: "1K" | "2K" | "4K",
  aspectRatio: "9:16" | "16:9" | "1:1"
): Promise<string | null> => {
  const fullPrompt = `Style: ${style}. ${prompt}. High quality, detailed.`;
  
  try {
    const response = await generateAIContent({
        model: APP_MODEL_CONFIG[AppID.WALLPAPER_AI], 
        contents: { parts: [{ text: fullPrompt }] },
        config: {
            // Note: This specific config structure depends on the specific Google GenAI SDK version 
            // and if the endpoint supports experimental image generation parameters.
            // If standard text models are used, this will likely fail or return text description of image.
            // Assuming this connects to an Imagen-capable endpoint wrapper.
            // @ts-ignore
            imageConfig: { aspectRatio: aspectRatio, imageSize: resolution }
        }
    });

    // Check for inline image data in response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return part.inlineData.data;
    }
    return null;
  } catch (e) {
      console.error("Image Generation Failed:", e);
      return null;
  }
};

/**
 * Helper specifically for Album Artwork (Square, 1K)
 */
export const generateImage = async (prompt: string): Promise<string | null> => {
    // Re-use the existing pipeline but force 1:1 aspect ratio for albums
    return generateWallpaper(prompt, "Album Cover Art", "1K", "1:1");
};
