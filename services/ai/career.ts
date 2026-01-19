
import { Type } from "@google/genai";
import { APP_MODEL_CONFIG, generateAIContent } from "./core";
import { getArray, getString, parseJsonObject } from "./parse";
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

  const response = await generateAIContent({
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

  const result = parseJsonObject(response.text);
  if (!result) {
    return { question: "", type: "text", options: [], context: "" };
  }
  const options = getArray(result, "options").filter((item): item is string => typeof item === "string");
  const type = getString(result, "type", "text");
  return {
    question: getString(result, "question", ""),
    type: type === "choice" || type === "boolean" ? type : "text",
    options,
    context: getString(result, "context", "")
  };
};
