
import { Type } from "@google/genai";
import { getAIClient, APP_MODEL_CONFIG, normalizeAiJson } from "./core";
import { AppID } from "../../types";

export interface NSFWConsultation {
  questions: string[];
}

export interface NSFWStrategy {
  persona: {
    archetype: string;
    hook: string;
    sirenCall: string; // Catchphrase
    bio: string;
  };
  tosGuide: {
    safeForSocials: string[];
    premiumOnly: string[];
  };
  revenuePlan: {
    day: string;
    theme: string;
    action: string;
    psychology: string;
  }[];
}

export const generateNSFWConsultation = async (niche: string): Promise<NSFWConsultation> => {
  const ai = getAIClient();
  const systemInstruction = `You are a specialized Brand Consultant for the adult content industry (OnlyFans, Patreon, Romance Authors).
  Your goal is to help creators monetize through EMOTION and PSYCHOLOGY, avoiding explicit content violation issues on social media.
  
  Task: Given a user's niche idea, generate 3-4 deep, probing questions to flesh out their brand persona.
  Questions should focus on:
  1. The emotional dynamic (e.g. Dominant/Nurturing).
  2. The target audience's "pain point" (e.g. loneliness, need for chaos, need for praise).
  3. Boundaries (Hard/Soft limits for the brand).
  
  Tone: Professional, direct, understanding of the industry nuance.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      questions: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ['questions']
  };

  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.NSFW_AI],
    contents: `Niche Concept: "${niche}". Generate consultation questions.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema
    }
  });

  return normalizeAiJson<NSFWConsultation>(response.text || '', responseSchema);
};

export const generateNSFWStrategy = async (niche: string, answers: string[]): Promise<NSFWStrategy> => {
  const ai = getAIClient();
  const systemInstruction = `You are an elite Revenue Strategist for adult content creators.
  Your expertise is maximizing revenue by selling INTENTION and DESIRE, rather than just nudity.
  
  Goal: Create a complete brand persona and a 7-Day Revenue Plan based on the user's niche and answers.
  
  Safety Rule: Do NOT generate sexually explicit descriptions that would violate Open AI or standard safety policies. 
  Focus on the *marketing*, *implication*, and *psychological* aspects (e.g. "teasing", "revealing", "intimate conversation").
  
  Output Requirements:
  1. Persona: Define the archetype (e.g. "The Gothic Savior", "The Girl Next Door").
  2. TOS Guide: Clearly list what is "Safe" for Instagram/TikTok vs what must be gatekept for Premium (Patreon/OF).
  3. 7-Day Plan: A repeatable cycle. Each day must have a Theme, a specific Action (content to post), and the Psychological Trigger it hits (e.g. "Scarcity", "Parasocial Bond").
  `;

  const prompt = `Niche: "${niche}".
  User Answers:
  ${answers.map((a, i) => `${i + 1}. ${a}`).join('\n')}
  
  Generate the Strategy.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      persona: {
        type: Type.OBJECT,
        properties: {
          archetype: { type: Type.STRING },
          hook: { type: Type.STRING },
          sirenCall: { type: Type.STRING, description: "A seductive brand tagline" },
          bio: { type: Type.STRING }
        },
        required: ['archetype', 'hook', 'sirenCall', 'bio']
      },
      tosGuide: {
        type: Type.OBJECT,
        properties: {
          safeForSocials: { type: Type.ARRAY, items: { type: Type.STRING } },
          premiumOnly: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['safeForSocials', 'premiumOnly']
      },
      revenuePlan: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            day: { type: Type.STRING },
            theme: { type: Type.STRING },
            action: { type: Type.STRING },
            psychology: { type: Type.STRING }
          },
          required: ['day', 'theme', 'action', 'psychology']
        }
      }
    },
    required: ['persona', 'tosGuide', 'revenuePlan']
  };

  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.NSFW_AI],
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema
    }
  });

  return normalizeAiJson<NSFWStrategy>(response.text || '', responseSchema);
};
