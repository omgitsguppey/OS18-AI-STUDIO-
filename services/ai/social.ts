
import { Type } from "@google/genai";
import { generateOptimizedContent } from "./core";
import { AppID } from "../../types";
import { processDramaDataInWorker } from "../dramaWorker";

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  platform: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  communityBuzz?: { source: string; comment: string }[];
}

export interface CaptionOutput {
  title?: string;
  description?: string;
  tags?: string;
  postCaption?: string;
  onPostCaption?: string;
}

export const generateCaption = async (
  platform: 'YouTube' | 'TikTok' | 'Instagram',
  prompt: string,
  userStyle?: string
): Promise<CaptionOutput> => {
  const context = userStyle ? `User specific writing style: ${userStyle}` : "";
  
  const systemPrompt = `You are a social media expert. Generate high-quality content for ${platform}.
  ${context}
  If platform is YouTube: focus on Title, Description, and Tags (comma separated, max 500 chars).
  If platform is Instagram or TikTok: focus on Post Caption and On-Post Overlay text.
  Respond in JSON format.`;

  const response = await generateOptimizedContent(
    AppID.CAPTIONS,
    prompt,
    {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          tags: { type: Type.STRING },
          postCaption: { type: Type.STRING },
          onPostCaption: { type: Type.STRING }
        }
      }
    }
  );

  return JSON.parse(response.text || '{}');
};

export const trainCaptionAI = async (
  username: string,
  platform: string,
  examples: string
): Promise<string> => {
  const platformNuance = platform === 'YouTube' 
    ? "Focus on high-click-through-rate titles and SEO-rich descriptions." 
    : platform === 'TikTok' 
    ? "Focus on high-energy hooks and text overlays that stop the scroll."
    : "Focus on aesthetic formatting, community engagement, and strategic hashtag use.";

  const prompt = `Analyze the following examples of social media posts by "${username}" on ${platform}:
  ${examples}
  
  Summarize this writing style into a compact rulebook that can be used to recreate this voice specifically for ${platform}. 
  ${platformNuance}
  Focus on tone, emoji usage, structural habits, and call-to-actions.`;

  const response = await generateOptimizedContent(
    AppID.CAPTIONS,
    prompt,
    {}
  );

  return response.text || "";
};

export const fetchDramaTimeline = async (creatorName: string): Promise<{ events: TimelineEvent[], summary: string }> => {
  try {
    const prompt = `Find top 3-5 recent viral events or news for creator "${creatorName}".`;

    const response = await generateOptimizedContent(
      AppID.DRAMA,
      prompt,
      {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "1-2 sentence overview." },
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING, description: "MM/DD/YYYY" },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  platform: { type: Type.STRING, enum: ["YouTube", "TikTok", "Reddit", "Instagram", "Twitter", "Web"] },
                  sentiment: { type: Type.STRING, enum: ["positive", "negative", "neutral"] },
                  communityBuzz: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        source: { type: Type.STRING },
                        comment: { type: Type.STRING }
                      }
                    }
                  }
                },
                required: ["date", "title", "description", "platform", "sentiment"]
              }
            }
          },
          required: ["summary", "events"]
        }
      }
    );

    const text = response.text || '{}';
    return await processDramaDataInWorker(text);

  } catch (error) {
    console.error("Drama Fetch Error:", error);
    return { events: [], summary: "Connection error or parsing failed." };
  }
};

// --- GET FAMOUS AI ---

export interface FameStep {
  day: string;
  action: string;
  psychologicalTactic: string;
  majorLabelSecret: string;
}

export interface FamePhase {
  phaseName: string;
  goal: string;
  steps: FameStep[];
}

export interface FameRoadmap {
  projectTitle: string;
  theAngle: string;
  targetArchetype: string;
  phases: FamePhase[];
}

export const generateFamePlan = async (idea: string, currentStatus: string): Promise<FameRoadmap> => {
  const systemInstruction = `You are a ruthless Major Label Executive and Behavioral Psychologist.
  Your job is to manufacture fame for a project. 
  You don't rely on luck. You rely on psychological triggers, manufactured controversy, scarcity, social proof, and algorithmic manipulation.
  
  Task: Create a tactical, day-by-day roadmap to make the user's idea famous.
  
  Structure:
  1. The Angle: The strategic hook that makes this undeniable.
  2. Target Archetype: Who exactly are we manipulating into becoming fans?
  3. Phases:
     - Phase 1: The Tease (Priming & Scarcity)
     - Phase 2: The Spark (Viral Trigger & Controversy)
     - Phase 3: The Inferno (Scale & Social Proof)
     
  For each step, include a "Major Label Secret" - a tactic usually reserved for industry insiders (e.g. buying dormant accounts, manufactured leaks, etc).`;

  const prompt = `Project Idea: "${idea}". Current Status: "${currentStatus}". Generate the Fame Roadmap.`;

  const response = await generateOptimizedContent(
    AppID.GET_FAMOUS,
    prompt,
    {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          projectTitle: { type: Type.STRING },
          theAngle: { type: Type.STRING },
          targetArchetype: { type: Type.STRING },
          phases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phaseName: { type: Type.STRING },
                goal: { type: Type.STRING },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      day: { type: Type.STRING },
                      action: { type: Type.STRING },
                      psychologicalTactic: { type: Type.STRING },
                      majorLabelSecret: { type: Type.STRING }
                    },
                    required: ['day', 'action', 'psychologicalTactic', 'majorLabelSecret']
                  }
                }
              },
              required: ['phaseName', 'goal', 'steps']
            }
          }
        },
        required: ['projectTitle', 'theAngle', 'targetArchetype', 'phases']
      }
    }
  );

  return JSON.parse(response.text || '{}');
};
