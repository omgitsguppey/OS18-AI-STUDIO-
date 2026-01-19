
import { Type } from "@google/genai";
import { APP_MODEL_CONFIG, generateAIContent } from "./core";
import { getArray, getString, mapRecordArray, parseJsonObject } from "./parse";
import { AppID } from "../../types";

export interface ViralPlan {
  id: string;
  target: string;
  createdAt: number;
  nicheAccounts: {
    niche: string;
    accountNameIdea: string;
    contentStyle: string;
    audioUtilization: string;
  }[];
  quarterlyRoadmap: {
    quarter: string;
    focus: string;
    actions: string[];
  }[];
  contentIdStrategy: string;
}

export const generateViralContentPlan = async (
  targetName: string,
  artistName: string,
  context: string
): Promise<Omit<ViralPlan, 'id' | 'createdAt'>> => {
  // Template stitching: We ask AI only for the specific creative variable 'nicheAccounts'
  // The roadmap structure is largely deterministic for this strategy.
  
  const systemInstruction = `You are a Growth Strategist.
  The user is an artist creating "burner" accounts to promote their song "${targetName}".
  
  Task: Suggest 4 distinct, unrelated niche concepts (e.g. Slime, Travel, Quotes) where the user can hide their music in the background.
  For each, provide an account name idea, visual style, and how the audio is used.
  
  Also provide a specific 'contentIdStrategy' (e.g. "Sped up + Reverb for TikTok mapping").
  
  Do NOT generate the quarterly roadmap. That is handled by the system.
  `;

  const prompt = `Target: "${targetName}" by ${artistName}. Context: "${context}".`;

  const response = await generateAIContent({
    model: APP_MODEL_CONFIG[AppID.VIRAL_PLAN_AI],
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nicheAccounts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                niche: { type: Type.STRING },
                accountNameIdea: { type: Type.STRING },
                contentStyle: { type: Type.STRING },
                audioUtilization: { type: Type.STRING }
              },
              required: ['niche', 'accountNameIdea', 'contentStyle', 'audioUtilization']
            }
          },
          contentIdStrategy: { type: Type.STRING }
        },
        required: ['nicheAccounts', 'contentIdStrategy']
      }
    }
  });

  const aiResult = parseJsonObject(response.text);
  const accounts = aiResult ? mapRecordArray(getArray(aiResult, "nicheAccounts")).map((entry) => ({
    niche: getString(entry, "niche", ""),
    accountNameIdea: getString(entry, "accountNameIdea", ""),
    contentStyle: getString(entry, "contentStyle", ""),
    audioUtilization: getString(entry, "audioUtilization", "")
  })).filter((entry) => entry.niche && entry.accountNameIdea && entry.contentStyle && entry.audioUtilization) : [];

  // Hard-coded Strategy Template (Deterministic)
  const quarterlyRoadmap = [
    {
      quarter: "Q1: Seed & Signal",
      focus: "Volume & Testing",
      actions: [
        "Create 4 burner accounts (1 per niche).",
        "Post 2 videos/day on each account using AI visuals.",
        "Use target audio in background at 5% volume or hidden.",
        "Analyze which niche gets algorithmic traction."
      ]
    },
    {
      quarter: "Q2: Double Down",
      focus: "Optimization",
      actions: [
        "Kill the 2 lowest performing accounts.",
        "Start a 2nd account in the winning niche.",
        "Increase audio volume to 20% on winning formats.",
        "Begin replying to comments as the 'mystery artist'."
      ]
    },
    {
      quarter: "Q3: The Reveal",
      focus: "Conversion",
      actions: [
        "Pin a video revealing 'Song Name' in comments.",
        "Remix successful videos with official visualizer clips.",
        "Launch 'Open Verse' challenge on main artist profile.",
        "Direct traffic from burners to main profile."
      ]
    },
    {
      quarter: "Q4: Scale & Monetize",
      focus: "Dominance",
      actions: [
        "License successful burner content to other curators.",
        "Release 'Sped Up' and 'Slowed' versions officially.",
        "Retarget view audiences with tour/merch ads.",
        "Automate the content pipeline fully."
      ]
    }
  ];

  return {
    target: targetName,
    nicheAccounts: accounts,
    contentIdStrategy: aiResult ? getString(aiResult, "contentIdStrategy", "Focus on background usage.") : "Focus on background usage.",
    quarterlyRoadmap
  };
};
