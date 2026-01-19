
import { Type } from "@google/genai";
import { APP_MODEL_CONFIG, generateAIContent } from "./core";
import { getArray, getBoolean, getString, mapRecordArray, parseJsonObject } from "./parse";
import { AppID } from "../../types";

export interface PriorityTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface PriorityPlan {
  id: string;
  originalThought: string;
  title: string;
  tasks: PriorityTask[];
  motivation: string;
  createdAt: number;
}

export const breakdownTask = async (input: string): Promise<Omit<PriorityPlan, 'id' | 'createdAt'>> => {
  const systemInstruction = `You are a Ruthless Prioritizer and Anti-Procrastination Engine.
  The user is suffering from analysis paralysis or overthinking.
  Your Goal: Take their complex, messy, or overwhelming thought and break it down into 3-5 stupidly simple, immediate, physical actions.
  
  Rules:
  1. No fluff. No corporate speak.
  2. Tasks must be actionable in under 15 minutes each if possible.
  3. The "motivation" should be punchy, slightly aggressive but encouraging (e.g., "Stop thinking, start moving.").
  4. Max 6 tasks.
  `;

  const response = await generateAIContent({
    model: APP_MODEL_CONFIG[AppID.PRIORITY_AI],
    contents: `Overwhelmed by: "${input}"`,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A simple 3-word title for this session" },
          tasks: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                completed: { type: Type.BOOLEAN }
              },
              required: ['text', 'completed']
            } 
          },
          motivation: { type: Type.STRING }
        },
        required: ['title', 'tasks', 'motivation']
      }
    }
  });

  const result = parseJsonObject(response.text);
  if (!result) {
    return { title: "", tasks: [], motivation: "" };
  }
  const tasks = mapRecordArray(getArray(result, "tasks")).map((task) => ({
    text: getString(task, "text", ""),
    completed: getBoolean(task, "completed", false)
  })).filter((task) => task.text.length > 0);
  return {
    title: getString(result, "title", ""),
    tasks,
    motivation: getString(result, "motivation", "")
  };
};
