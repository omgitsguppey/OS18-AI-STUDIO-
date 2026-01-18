
import { Type } from "@google/genai";
import { getAIClient, APP_MODEL_CONFIG } from "./core";
import { AppID } from "../../types";

export interface TrendItem {
  id: string;
  source: 'Reddit' | 'Google' | 'Twitter' | 'Aggregator';
  title: string;
  volume?: string;
  snippet?: string;
  url?: string;
  timestamp: number;
}

export interface TrendAnalysis {
  trendId: string;
  viralityScore: number; // 0-100
  sentimentScore: number; // -100 to 100
  growthRate: string; // e.g. "+450%"
  estimatedReach: string; // e.g. "5.2M"
  engagementRatio: string; // e.g. "8.5%"
  lifespanDays: number;
  platformDistribution: { platform: string; percentage: number }[];
  keyKeywords: string[];
  summary: string;
}

// 1. Non-AI Scraper (Reddit + Live AI Fallback)
export const fetchRawTrends = async (): Promise<TrendItem[]> => {
  try {
    // Attempt Reddit (often allows CORS for read-only json)
    const res = await fetch('https://www.reddit.com/r/popular.json?limit=15');
    if (!res.ok) throw new Error('CORS or Network Error');
    const data = await res.json();
    return data.data.children.map((child: any) => ({
      id: child.data.id,
      source: 'Reddit',
      title: child.data.title,
      volume: `${(child.data.ups / 1000).toFixed(1)}k upvotes`,
      snippet: child.data.selftext?.substring(0, 100) || '',
      url: `https://reddit.com${child.data.permalink}`,
      timestamp: child.data.created_utc * 1000
    }));
  } catch (e) {
    // Fallback: Use Gemini with Google Search to get REAL current trends instead of mock data.
    // This ensures "absolutely nothing is simulative".
    try {
        return await searchGoogleTrends("current viral trends technology music news");
    } catch (innerError) {
        console.error("All trend fetch methods failed", innerError);
        return []; // Return empty rather than fake data
    }
  }
};

// 2. Gemini Flash Lite + Google Search
export const searchGoogleTrends = async (query: string): Promise<TrendItem[]> => {
  const ai = getAIClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest', // Explicitly requested Lite model
    contents: `Find 5 currently trending news items or discussions related to: "${query}". 
    Return a valid JSON array of objects with keys: title, volume (e.g. "High"), snippet, and source (e.g. "Google Search").`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            volume: { type: Type.STRING },
            snippet: { type: Type.STRING },
            source: { type: Type.STRING }
          },
          required: ['title', 'snippet']
        }
      }
    }
  });
  
  const items = JSON.parse(response.text || '[]');
  
  // Augment with grounding data if available (URLs)
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  return items.map((item: any, index: number) => {
    // Try to find a matching URL from grounding chunks
    const grounding = chunks[index] as any;
    const url = grounding?.web?.uri || '';
    
    return {
      id: `search-${Date.now()}-${index}`,
      source: 'Google',
      title: item.title,
      volume: item.volume || 'Trending',
      snippet: item.snippet,
      url: url,
      timestamp: Date.now()
    };
  });
};

// 3. Gemini 3 Flash Pattern Analysis (Quantitative Focus + Real Time Grounding)
export const analyzeTrendPattern = async (trendTitle: string, context: string): Promise<TrendAnalysis> => {
  const ai = getAIClient();
  
  const systemInstruction = `You are a Real-Time Data Analyst. 
  You MUST use the Google Search tool to gather ACTUAL metrics for the requested trend.
  Do NOT simulate numbers. Base your calculations on the live search results found.
  
  Calculations:
  - viralityScore: Calculate based on the frequency of "breaking news" labels and timestamps within the last 24h found in search.
  - sentimentScore: Analyze the sentiment of the top 10 search result snippets (-100 to 100).
  - growthRate: Infer from the velocity of recent articles (e.g. "2 hours ago" vs "2 days ago").
  - estimatedReach: Sum of estimated monthly traffic for the major publishers found (e.g. NYT, Reddit, Twitter).
  - platformDistribution: Calculate percentage based on the domains found in the search results (e.g. reddit.com vs youtube.com).
  `;
  
  const prompt = `Analyze real-time data for: "${trendTitle}". Context: "${context}".
  Perform a Google Search to find the latest engagement numbers and article volume.`;

  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.TRENDS_AI],
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          viralityScore: { type: Type.NUMBER, description: "0 to 100 based on search density" },
          sentimentScore: { type: Type.NUMBER, description: "-100 to 100 based on result sentiment" },
          growthRate: { type: Type.STRING, description: "e.g. +120% (WoW)" },
          estimatedReach: { type: Type.STRING, description: "e.g. 2.5M" },
          engagementRatio: { type: Type.STRING, description: "e.g. 5.2%" },
          lifespanDays: { type: Type.NUMBER, description: "Remaining days of relevance" },
          platformDistribution: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                platform: { type: Type.STRING },
                percentage: { type: Type.NUMBER }
              },
              required: ["platform", "percentage"]
            }
          },
          keyKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING, description: "1 sentence data summary based on search results" }
        },
        required: [
          "viralityScore", "sentimentScore", "growthRate", "estimatedReach", 
          "engagementRatio", "lifespanDays", "platformDistribution", "keyKeywords", "summary"
        ]
      }
    }
  });

  return {
    trendId: '', // Assigned by caller
    ...JSON.parse(response.text || '{}')
  };
};
