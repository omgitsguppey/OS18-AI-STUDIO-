
import { GenerateContentResponse } from "@google/genai";
import { getAIClient, APP_MODEL_CONFIG } from "./core";

export async function* streamGeminiChat(
  message: string,
  history: { role: string; content: string }[],
  memory: string
) {
  const ai = getAIClient();
  const systemInstruction = `You are a helpful AI assistant with long-term memory. 
  Current Memory: ${memory || "No previous memory stored."}
  If you learn something new and important about the user, wrap it in [[MEMORY: facts]]. 
  Keep responses concise (max 2 sentences).`;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: APP_MODEL_CONFIG['chat'],
      contents: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      })),
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    for await (const chunk of responseStream) {
      const response = chunk as GenerateContentResponse;
      const text = response.text;
      if (text) yield text;
    }
  } catch (error) {
    console.error("Gemini Streaming Error:", error);
    yield "Error processing request.";
  }
}
