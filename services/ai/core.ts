
import { asArray } from "../utils/normalize";
import { AppID } from "../../types";
import { systemCore } from "../systemCore";

const AI_GENERATE_ENDPOINT = '/api/ai/generate';
const AI_STREAM_ENDPOINT = '/api/ai/stream';
const AI_VIDEO_ENDPOINT = '/api/ai/videos';

export interface AIProxyResponse {
  text: string;
  candidates: any[];
}

export interface AIProxyRequest {
  model: string;
  contents: unknown;
  config?: unknown;
}

export interface AIVideoRequest {
  model: string;
  prompt: string;
  config?: unknown;
}

export interface AIVideoResponse {
  proxyUrl: string | null;
}

const normalizeProxyResponse = (raw: unknown): AIProxyResponse => {
  if (!raw || typeof raw !== 'object') {
    return { text: '', candidates: [] };
  }
  const data = raw as { text?: unknown; candidates?: unknown };
  const text = typeof data.text === 'string' ? data.text : '';
  const candidates = asArray<any>(data.candidates);
  return { text, candidates };
};

const postJson = async (url: string, payload: unknown): Promise<Response> => {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
};

export const generateAIContent = async (request: AIProxyRequest): Promise<AIProxyResponse> => {
  const response = await postJson(AI_GENERATE_ENDPOINT, request);
  if (!response.ok) {
    const error = new Error(`AI proxy request failed (${response.status}).`);
    (error as { status?: number }).status = response.status;
    throw error;
  }
  const raw = await response.json();
  return normalizeProxyResponse(raw);
};

export async function* streamAIContent(request: AIProxyRequest): AsyncGenerator<string> {
  const response = await postJson(AI_STREAM_ENDPOINT, request);
  if (!response.ok || !response.body) {
    throw new Error(`AI stream request failed (${response.status}).`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line) {
        try {
          const parsed = JSON.parse(line);
          const normalized = normalizeProxyResponse(parsed);
          if (normalized.text) {
            yield normalized.text;
          }
        } catch (error) {
          console.error("AI stream parse error", error);
        }
      }
      newlineIndex = buffer.indexOf('\n');
    }
  }

  const finalLine = buffer.trim();
  if (finalLine) {
    try {
      const parsed = JSON.parse(finalLine);
      const normalized = normalizeProxyResponse(parsed);
      if (normalized.text) {
        yield normalized.text;
      }
    } catch (error) {
      console.error("AI stream parse error", error);
    }
  }
}

export const generateAIVideo = async (request: AIVideoRequest): Promise<AIVideoResponse> => {
  const response = await postJson(AI_VIDEO_ENDPOINT, request);
  if (!response.ok) {
    throw new Error(`AI video request failed (${response.status}).`);
  }
  const raw = await response.json();
  if (!raw || typeof raw !== 'object') {
    return { proxyUrl: null };
  }
  const data = raw as { proxyUrl?: unknown };
  return { proxyUrl: typeof data.proxyUrl === 'string' ? data.proxyUrl : null };
};

// Model Registry
export const APP_MODEL_CONFIG: Record<string, string> = {
  [AppID.CAPTIONS]: 'gemini-flash-lite-latest',
  [AppID.MARKUP_AI]: 'gemini-flash-lite-latest',
  [AppID.LYRICS_AI]: 'gemini-flash-lite-latest',
  [AppID.ANALYTICS_AI]: 'gemini-flash-lite-latest',
  [AppID.CAREER_AI]: 'gemini-flash-lite-latest',
  [AppID.CONTENT_AI]: 'gemini-3-flash-preview',
  [AppID.DRAMA]: 'gemini-3-flash-preview',
  [AppID.SELL_IT]: 'gemini-3-flash-preview',
  [AppID.TRENDS_AI]: 'gemini-3-flash-preview',
  [AppID.WALLPAPER_AI]: 'gemini-3-pro-image-preview',
  [AppID.GET_FAMOUS]: 'gemini-3-pro-preview',
  [AppID.PRIORITY_AI]: 'gemini-flash-lite-latest',
  [AppID.BRAND_KIT_AI]: 'gemini-flash-lite-latest',
  [AppID.VIRAL_PLAN_AI]: 'gemini-3-pro-preview',
  [AppID.AI_PLAYGROUND]: 'gemini-flash-lite-latest',
  [AppID.PLAYLIST_AI]: 'gemini-3-flash-preview',
  [AppID.ACHIEVEMENTS]: 'gemini-3-pro-image-preview',
  [AppID.NSFW_AI]: 'gemini-flash-lite-latest',
  [AppID.TRAP_AI]: 'gemini-flash-lite-latest',
  [AppID.SPEECH_AI]: 'gemini-2.5-flash-preview-tts',
  [AppID.SHORTS_STUDIO]: 'gemini-flash-lite-latest',
  'shorts_studio_image': 'gemini-2.5-flash-image',
  'shorts_studio_video': 'veo-3.1-fast-generate-preview',
  'achievements_edit': 'gemini-2.5-flash-image',
  'chat': 'gemini-3-flash-preview'
};

export const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Retry Utility for robustness
const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    if (retries === 0 || err.status === 400) throw err; // Don't retry client errors
    await new Promise(res => setTimeout(res, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
};

/**
 * INTELLIGENT WRAPPER (v2)
 * Connects the System Intelligence Layer to the Gemini API.
 */
export const generateOptimizedContent = async (
    appId: string,
    originalContents: any, // string or object
    config: any = {},
    isRegen: boolean = false
): Promise<AIProxyResponse> => {
    const model = APP_MODEL_CONFIG[appId] || 'gemini-flash-lite-latest';
    
    // 1. Telemetry: Track the request
    systemCore.trackInteraction(appId, isRegen ? 'regenerate' : 'generate');

    // 2. Intelligence: Dynamic Temperature
    const dynamicTemp = systemCore.getDynamicTemperature();
    const finalConfig = {
        ...config,
        temperature: config.temperature ?? dynamicTemp
    };

    // 3. Intelligence: Scoped Prompt Injection
    // Determine scope based on App ID
    let scope: 'Global' | 'Creative' | 'Business' | 'Utility' = 'Global';
    if ([AppID.LYRICS_AI, AppID.WALLPAPER_AI, AppID.TRAP_AI, AppID.PLAYLIST_AI].includes(appId as AppID)) scope = 'Creative';
    if ([AppID.SELL_IT, AppID.MARKUP_AI, AppID.ANALYTICS_AI, AppID.VIRAL_PLAN_AI].includes(appId as AppID)) scope = 'Business';
    if ([AppID.CALCULATOR, AppID.CONVERT_AI].includes(appId as AppID)) scope = 'Utility';

    let finalContents = originalContents;
    if (typeof originalContents === 'string') {
        finalContents = systemCore.getOptimizedPrompt(originalContents, appId, scope);
    } else if (originalContents.parts && originalContents.parts[0]?.text) {
        // Handle object structure { parts: [{ text: ... }] }
        const newParts = [...originalContents.parts];
        newParts[0] = { 
            ...newParts[0], 
            text: systemCore.getOptimizedPrompt(newParts[0].text, appId, scope) 
        };
        finalContents = { ...originalContents, parts: newParts };
    }

    // 4. Execute with Retry & Telemetry
    const start = Date.now();
    try {
        const response = await retryWithBackoff<AIProxyResponse>(() => generateAIContent({
          model,
          contents: finalContents,
          config: finalConfig
        }));
        
        // Log completion for real metrics
        const outputLength = response.text?.length || 0;
        const inputLength = JSON.stringify(finalContents).length;
        systemCore.trackInteraction(appId, 'completion', { inputLength, outputLength, latency: Date.now() - start });
        
        return response;
    } catch (e: any) {
        // Log failure
        systemCore.trackInteraction(appId, 'error', { error: e.message });
        throw e;
    }
};
