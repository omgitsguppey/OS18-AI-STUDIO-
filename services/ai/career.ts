
import { Type } from "@google/genai";
import { getAIClient, APP_MODEL_CONFIG } from "./core";
import { AppID } from "../../types";

export interface CareerQuestion {
  question: string;
  type: 'text' | 'choice' | 'boolean';
  options?: string[];
  context?: string;
}

export const generateCareerQuestion = async (
  profileName: string,
  timelineSummary: string[]
): Promise<CareerQuestion> => {
  const ai = getAIClient();
  const systemInstruction = `You are an elite career coach building a LinkedIn-style portfolio for "${profileName}".
  Review their current career timeline (summarized below).
  
  Task:
  Ask the ONE most important question to uncover a missing achievement, a specific metric (revenue, efficiency), or a leadership moment.
  Do not ask generic questions like "Tell me more". Be specific.
  
  Output format (JSON):
  - question: The string text.
  - type: "text" (open-ended), "choice" (multiple choice), or "boolean" (yes/no).
  - options: Array of strings if type is "choice".
  - context: A brief explanation of why you are asking this (internal thought).
  `;

  const prompt = `Current Timeline Summary: ${JSON.stringify(timelineSummary)}`;

  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.CAREER_AI],
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['text', 'choice', 'boolean'] },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          context: { type: Type.STRING }
        },
        required: ['question', 'type', 'context']
      }
    }
  });

  return JSON.parse(response.text || '{}');
};
