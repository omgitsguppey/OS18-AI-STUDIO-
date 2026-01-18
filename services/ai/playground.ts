
import { Type } from "@google/genai";
import { getAIClient, APP_MODEL_CONFIG } from "./core";
import { AppID } from "../../types";

// --- 1. PIXEL EVOLVER ---
export const evolvePixelGrid = async (prompt: string, currentGrid: string[] | null, feedback: string): Promise<string[]> => {
  const ai = getAIClient();
  const instruction = `You are a Pixel Art AI. You output ONLY a JSON array of 64 hex codes (8x8 grid).
  Task: Draw "${prompt}".
  ${currentGrid ? `Previous Attempt (flattened): ${JSON.stringify(currentGrid)}` : ""}
  ${feedback ? `User Feedback on previous attempt: "${feedback}". Improve based on this.` : ""}
  Use vibrant colors.`;

  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.AI_PLAYGROUND],
    contents: "Generate grid.",
    config: {
      systemInstruction: instruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          grid: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['grid']
      }
    }
  });
  
  const result = JSON.parse(response.text || '{}');
  return result.grid || Array(64).fill('#000000');
};

// --- 2. FLOW STATE (RAP) ---
export const generateRap = async (topic: string, difficulty: number): Promise<{ verses: string[], score: number }> => {
  const ai = getAIClient();
  const complexity = difficulty === 1 ? "Simple AABB rhyme scheme." : difficulty === 2 ? "Multi-syllabic rhymes, internal rhyming." : "God-tier flow, dense wordplay, metaphors.";
  
  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.AI_PLAYGROUND],
    contents: `Write a short 4-bar rap verse about "${topic}".
    Complexity Level: ${complexity}
    Output JSON with 'verses' (array of strings) and a 'score' (1-100 based on how hard you think you went).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          verses: { type: Type.ARRAY, items: { type: Type.STRING } },
          score: { type: Type.NUMBER }
        },
        required: ['verses', 'score']
      }
    }
  });

  return JSON.parse(response.text || '{"verses": [], "score": 0}');
};

// --- 3. ALCHEMY (CRAFT) ---
export const combineEmojis = async (itemA: string, itemB: string): Promise<{ result: string, emoji: string, isNew: boolean }> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.AI_PLAYGROUND],
    contents: `Combine concept "${itemA}" and "${itemB}". What new item does this create?
    Example: Fire + Water = Steam (💨).
    Return JSON: { "result": "Name", "emoji": "👾", "isNew": boolean (random chance if obscure) }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          result: { type: Type.STRING },
          emoji: { type: Type.STRING },
          isNew: { type: Type.BOOLEAN }
        },
        required: ['result', 'emoji', 'isNew']
      }
    }
  });

  return JSON.parse(response.text || '{"result": "Nothing", "emoji": "❓", "isNew": false}');
};

// --- 4. FACT EATER (PET) ---
export interface PetState {
  name: string;
  mood: 'Happy' | 'Sad' | 'Confused' | 'Excited';
  level: number;
  knownFacts: string[];
}

export const feedPet = async (fact: string, currentState: PetState): Promise<{ response: string, newMood: string, leveledUp: boolean }> => {
  const ai = getAIClient();
  const instruction = `You are a digital pet named ${currentState.name}.
  Current Mood: ${currentState.mood}. Intelligence Level: ${currentState.level}.
  The user just fed you a fact: "${fact}".
  
  If the fact is interesting/complex: You become Excited, Level Up, and say a sentence using the fact.
  If the fact is gibberish/boring: You become Confused or Sad, do NOT level up, and complain.
  
  Output JSON.`;

  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.AI_PLAYGROUND],
    contents: "React to the food.",
    config: {
      systemInstruction: instruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          response: { type: Type.STRING },
          newMood: { type: Type.STRING, enum: ['Happy', 'Sad', 'Confused', 'Excited'] },
          leveledUp: { type: Type.BOOLEAN }
        },
        required: ['response', 'newMood', 'leveledUp']
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

// --- 5. STORY BRANCH ---
export const generateStoryNode = async (context: string, choice: string): Promise<{ text: string, options: string[] }> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.AI_PLAYGROUND],
    contents: `Continue the story.
    Context so far: ${context}
    User Choice: ${choice}
    
    Write a paragraph (max 30 words) continuing the plot.
    Provide 2 very different choices for what happens next.
    Output JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['text', 'options']
      }
    }
  });

  return JSON.parse(response.text || '{"text": "The end.", "options": ["Restart"]}');
};
