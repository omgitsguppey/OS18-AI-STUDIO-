
import { Type } from "@google/genai";
import { getAIClient, APP_MODEL_CONFIG } from "./core";
import { AppID } from "../../types";
import { LocalIntelligence } from "../localIntelligence";

export interface BrandColor {
  name: string;
  hex: string;
  usage: string;
}

export interface BrandKit {
  id: string;
  brandName: string;
  slogan: string;
  valueProposition: string;
  missionStatement: string;
  targetAudience: string;
  colors: BrandColor[];
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  metrics: {
    label: string;
    target: string;
  }[];
  pressKit: {
    shortBio: string;
    boilerplate: string;
  };
  createdAt: number;
}

export const generateBrandQuestions = async (brandName: string): Promise<string[]> => {
  const ai = getAIClient();
  const prompt = `I am building a brand identity for "${brandName}".
  Generate exactly 5 short, strategic questions to help define the brand's personality, audience, and goals.
  Return JSON object with a "questions" array of strings.`;

  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.BRAND_KIT_AI],
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['questions']
      }
    }
  });

  const data = JSON.parse(response.text || '{"questions": []}');
  return data.questions || [];
};

export const generateBrandKit = async (brandName: string, qaPairs: {q: string, a: string}[] = []): Promise<Omit<BrandKit, 'id' | 'createdAt'>> => {
  const ai = getAIClient();
  
  // Generate colors locally based on the name hash
  const colors = LocalIntelligence.generatePalette(brandName);

  const context = qaPairs.map(pair => `Q: ${pair.q}\nA: ${pair.a}`).join('\n');

  const systemInstruction = `You are a Brand Strategist.
  Generate a brand identity kit for "${brandName}".
  
  User Context (Answers to calibration questions):
  ${context}

  Focus on Slogan, Value Prop, Mission, Audience, Typography suggestions, and key Metrics based on the context provided.
  Do NOT generate colors (handled by system).
  `;

  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.BRAND_KIT_AI],
    contents: `Brand Name: "${brandName}". Generate Kit.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          brandName: { type: Type.STRING },
          slogan: { type: Type.STRING },
          valueProposition: { type: Type.STRING },
          missionStatement: { type: Type.STRING },
          targetAudience: { type: Type.STRING },
          typography: {
            type: Type.OBJECT,
            properties: {
              headingFont: { type: Type.STRING },
              bodyFont: { type: Type.STRING }
            },
            required: ['headingFont', 'bodyFont']
          },
          metrics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                target: { type: Type.STRING }
              },
              required: ['label', 'target']
            }
          },
          pressKit: {
            type: Type.OBJECT,
            properties: {
              shortBio: { type: Type.STRING },
              boilerplate: { type: Type.STRING }
            },
            required: ['shortBio', 'boilerplate']
          }
        },
        required: ['brandName', 'slogan', 'valueProposition', 'missionStatement', 'targetAudience', 'typography', 'metrics', 'pressKit']
      }
    }
  });

  const aiData = JSON.parse(response.text || '{}');
  
  return {
    ...aiData,
    colors: colors
  };
};
