
import { Type } from "@google/genai";
import { getAIClient, fileToBase64, APP_MODEL_CONFIG } from "./core";
import { AppID } from "../../types";
import { LocalIntelligence } from "../localIntelligence";

// --- MARKUP AI ---

export interface MarkupOpportunity {
  type: 'Affiliate' | 'White Label' | 'DFY Service';
  name: string;
  provider: string;
  description: string;
  baseCost: string;
  markupPrice: string;
  profitMargin: string;
  marketingAngle: string;
}

export interface MarkupStrategy {
  niche: string;
  summary: string;
  opportunities: MarkupOpportunity[];
}

export const generateMarkupStrategy = async (niche: string): Promise<MarkupStrategy> => {
  const ai = getAIClient();
  const prompt = `Identify business opportunities for: "${niche}".
  Find 3-5 items (Affiliate, White Label, DFY).
  Provide marketing angles and pricing.`;

  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.MARKUP_AI],
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          niche: { type: Type.STRING },
          summary: { type: Type.STRING },
          opportunities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['Affiliate', 'White Label', 'DFY Service'] },
                name: { type: Type.STRING },
                provider: { type: Type.STRING },
                description: { type: Type.STRING },
                baseCost: { type: Type.STRING },
                markupPrice: { type: Type.STRING },
                profitMargin: { type: Type.STRING },
                marketingAngle: { type: Type.STRING }
              },
              required: ['type', 'name', 'provider', 'description', 'baseCost', 'markupPrice', 'profitMargin', 'marketingAngle']
            }
          }
        },
        required: ['niche', 'summary', 'opportunities']
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

// --- PRODUCT STRATEGY (JUST SELL IT) ---

export interface ProductStrategy {
  productName: string;
  emotionalValueProp: string;
  painPoints: { problem: string; solution: string }[];
  audience: {
    demographics: string;
    psychographics: string;
  };
  pricing: {
    oneTime: string;
    subscriptionMonthly: string;
    subscriptionYearly: string;
  };
  // New Deep Analysis Fields
  marketingChannels: string[];
  salesFunnel: { stage: string; tactic: string }[];
  objections: { objection: string; rebuttal: string }[];
}

export const generateProductStrategy = async (productName: string, modifiers: string[] = []): Promise<ProductStrategy> => {
  const ai = getAIClient();
  const modifierContext = modifiers.length > 0 ? `Constraints: ${modifiers.join(', ')}.` : '';
  
  // Ask AI for qualitative strategy and a BASE PRICE NUMBER only
  const prompt = `Sales strategy for: "${productName}". ${modifierContext}
  Provide emotional value prop, pain points, audience breakdown.
  Identify top 3 marketing channels.
  Create a 4-step sales funnel (Awareness, Interest, Desire, Action).
  Identify top 3 customer objections and rebuttals.
  Also estimate a "basePriceEstimate" (number) for this type of product in USD.`;

  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.SELL_IT],
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING },
          emotionalValueProp: { type: Type.STRING },
          basePriceEstimate: { type: Type.NUMBER },
          marketingChannels: { type: Type.ARRAY, items: { type: Type.STRING } },
          painPoints: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { problem: { type: Type.STRING }, solution: { type: Type.STRING } },
              required: ["problem", "solution"]
            }
          },
          audience: {
            type: Type.OBJECT,
            properties: { demographics: { type: Type.STRING }, psychographics: { type: Type.STRING } },
            required: ["demographics", "psychographics"]
          },
          salesFunnel: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { stage: { type: Type.STRING }, tactic: { type: Type.STRING } },
                required: ["stage", "tactic"]
            }
          },
          objections: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { objection: { type: Type.STRING }, rebuttal: { type: Type.STRING } },
                required: ["objection", "rebuttal"]
            }
          }
        },
        required: ["productName", "emotionalValueProp", "basePriceEstimate", "painPoints", "audience", "marketingChannels", "salesFunnel", "objections"]
      }
    }
  });

  const data = JSON.parse(response.text || '{}');
  
  // Calculate pricing tiers deterministically
  const pricing = LocalIntelligence.calculatePricingTiers(data.basePriceEstimate || 50);

  return {
      ...data,
      pricing
  };
};

// --- ANALYTICS AI ---

export interface RevenueRecord {
  id: string;
  date: string;
  label: string;
  trackTitle: string;
  artist: string;
  platform: string;
  revenueAmount: number;
  currency: string;
}

export const parseRevenueFile = async (file: File): Promise<Omit<RevenueRecord, 'id'>[]> => {
  // 1. Heuristic Parsing for Text/CSV
  if (file.type === "text/csv" || file.type === "text/plain" || file.name.endsWith('.csv')) {
      const text = await file.text();
      const records = LocalIntelligence.parseCSV(text);
      if (records.length > 0) return records;
  }

  // 2. AI Fallback for Images/PDFs
  const ai = getAIClient();
  const base64Data = await fileToBase64(file);
  
  const systemInstruction = `Extract revenue data from this document.
  Return JSON array with: date (YYYY-MM-DD), label, trackTitle, artist, platform, revenueAmount (number), currency.`;

  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.ANALYTICS_AI],
    contents: {
      role: 'user',
      parts: [
        { inlineData: { mimeType: file.type || 'text/plain', data: base64Data } },
        { text: "Extract revenue records." }
      ]
    },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            label: { type: Type.STRING },
            trackTitle: { type: Type.STRING },
            artist: { type: Type.STRING },
            platform: { type: Type.STRING },
            revenueAmount: { type: Type.NUMBER },
            currency: { type: Type.STRING }
          },
          required: ['date', 'label', 'trackTitle', 'artist', 'platform', 'revenueAmount', 'currency']
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
};
