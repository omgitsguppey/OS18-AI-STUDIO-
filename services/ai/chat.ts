
import { APP_MODEL_CONFIG, streamAIContent } from "./core";

export async function* streamGeminiChat(
  message: string,
  history: { role: string; content: string }[],
  memory: string
) {
  const systemInstruction = `You are a helpful AI assistant with long-term memory. 
  Current Memory: ${memory || "No previous memory stored."}
  If you learn something new and important about the user, wrap it in [[MEMORY: facts]]. 
  Keep responses concise (max 2 sentences).`;

  try {
    const responseStream = streamAIContent({
      model: APP_MODEL_CONFIG['chat'],
      contents: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      })),
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    for await (const chunk of responseStream) {
      if (chunk) yield chunk;
    }
  } catch (error) {
    console.error("Gemini Streaming Error:", error);
    yield "Error processing request.";
  }
}
