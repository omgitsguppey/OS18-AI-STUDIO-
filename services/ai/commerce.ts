
import { Type } from "@google/genai";
import { fileToBase64, APP_MODEL_CONFIG, generateAIContent } from "./core";
import { getArray, getNumber, getString, isRecord, mapRecordArray, parseJsonArray, parseJsonObject } from "./parse";
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
  const prompt = `Identify business opportunities for: "${niche}".
  Find 3-5 items (Affiliate, White Label, DFY).
  Provide marketing angles and pricing.`;

  const response = await generateAIContent({
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

  const result = parseJsonObject(response.text);
  if (!result) {
    return { niche, summary: "", opportunities: [] };
  }
  const opportunities = mapRecordArray(getArray(result, "opportunities")).map((entry) => ({
    type: getString(entry, "type", "Affiliate") as MarkupOpportunity["type"],
    name: getString(entry, "name", ""),
    provider: getString(entry, "provider", ""),
    description: getString(entry, "description", ""),
    baseCost: getString(entry, "baseCost", ""),
    markupPrice: getString(entry, "markupPrice", ""),
    profitMargin: getString(entry, "profitMargin", ""),
    marketingAngle: getString(entry, "marketingAngle", "")
  })).filter((entry) => entry.name.length > 0);
  return {
    niche: getString(result, "niche", niche),
    summary: getString(result, "summary", ""),
    opportunities
  };
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
  const modifierContext = modifiers.length > 0 ? `Constraints: ${modifiers.join(', ')}.` : '';
  
  // Ask AI for qualitative strategy and a BASE PRICE NUMBER only
  const prompt = `Sales strategy for: "${productName}". ${modifierContext}
  Provide emotional value prop, pain points, audience breakdown.
  Identify top 3 marketing channels.
  Create a 4-step sales funnel (Awareness, Interest, Desire, Action).
  Identify top 3 customer objections and rebuttals.
  Also estimate a "basePriceEstimate" (number) for this type of product in USD.`;

  const response = await generateAIContent({
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

  const data = parseJsonObject(response.text);
  if (!data) {
    return {
      productName,
      emotionalValueProp: "",
      painPoints: [],
      audience: { demographics: "", psychographics: "" },
      pricing: LocalIntelligence.calculatePricingTiers(50),
      marketingChannels: [],
      salesFunnel: [],
      objections: []
    };
  }

  const painPoints = mapRecordArray(getArray(data, "painPoints")).map((entry) => ({
    problem: getString(entry, "problem", ""),
    solution: getString(entry, "solution", "")
  })).filter((entry) => entry.problem && entry.solution);
  const audienceRecord = isRecord(data.audience) ? data.audience : {};
  const salesFunnel = mapRecordArray(getArray(data, "salesFunnel")).map((entry) => ({
    stage: getString(entry, "stage", ""),
    tactic: getString(entry, "tactic", "")
  })).filter((entry) => entry.stage && entry.tactic);
  const objections = mapRecordArray(getArray(data, "objections")).map((entry) => ({
    objection: getString(entry, "objection", ""),
    rebuttal: getString(entry, "rebuttal", "")
  })).filter((entry) => entry.objection && entry.rebuttal);
  const marketingChannels = getArray(data, "marketingChannels").filter((item): item is string => typeof item === "string");
  const basePriceEstimate = getNumber(data, "basePriceEstimate", 50);

  // Calculate pricing tiers deterministically
  const pricing = LocalIntelligence.calculatePricingTiers(basePriceEstimate);

  return {
    productName: getString(data, "productName", productName),
    emotionalValueProp: getString(data, "emotionalValueProp", ""),
    painPoints,
    audience: {
      demographics: getString(audienceRecord, "demographics", ""),
      psychographics: getString(audienceRecord, "psychographics", "")
    },
    pricing,
    marketingChannels,
    salesFunnel,
    objections
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
  const base64Data = await fileToBase64(file);
  
  const systemInstruction = `Extract revenue data from this document.
  Return JSON array with: date (YYYY-MM-DD), label, trackTitle, artist, platform, revenueAmount (number), currency.`;

  const response = await generateAIContent({
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

  const records = parseJsonArray(response.text);
  return mapRecordArray(records).map((entry) => ({
    date: getString(entry, "date", ""),
    label: getString(entry, "label", ""),
    trackTitle: getString(entry, "trackTitle", ""),
    artist: getString(entry, "artist", ""),
    platform: getString(entry, "platform", ""),
    revenueAmount: getNumber(entry, "revenueAmount", 0),
    currency: getString(entry, "currency", "")
  })).filter((entry) => entry.date && entry.label && entry.trackTitle && entry.artist && entry.platform && entry.currency);
};
