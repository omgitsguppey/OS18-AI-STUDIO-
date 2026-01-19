
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AppID } from "../../types";
import { systemCore } from "../systemCore";
import { getCachedPolicy } from "../systemPolicyService";
import { auth } from "../firebaseConfig";

// Centralized API Client
export const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

const AI_NORMALIZE_ENDPOINT = '/api/ai/normalize';

type Schema =
  | { type: 'string'; enum?: string[] }
  | { type: 'number' | 'integer' }
  | { type: 'boolean' }
  | { type: 'object'; properties?: Record<string, Schema> }
  | { type: 'array'; items?: Schema };

type GenAiSchema = {
  type: Type;
  properties?: Record<string, GenAiSchema>;
  items?: GenAiSchema;
  enum?: string[];
};

const mapGenAiType = (type: Type): Schema['type'] => {
  switch (type) {
    case Type.STRING:
      return 'string';
    case Type.NUMBER:
      return 'number';
    case Type.INTEGER:
      return 'integer';
    case Type.BOOLEAN:
      return 'boolean';
    case Type.ARRAY:
      return 'array';
    case Type.OBJECT:
    default:
      return 'object';
  }
};

const coerceSchema = (schema: Schema | GenAiSchema): Schema => {
  if (typeof schema.type === 'string') {
    return schema as Schema;
  }
  const mappedType = mapGenAiType(schema.type);
  if (mappedType === 'array') {
    return {
      type: 'array',
      items: schema.items ? coerceSchema(schema.items) : undefined
    };
  }
  if (mappedType === 'object') {
    const properties = schema.properties
      ? Object.fromEntries(
          Object.entries(schema.properties).map(([key, value]) => [key, coerceSchema(value)])
        )
      : undefined;
    return {
      type: 'object',
      properties
    };
  }
  if (mappedType === 'string') {
    return {
      type: 'string',
      enum: schema.enum
    };
  }
  return { type: mappedType };
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeWithSchema = (value: unknown, schema: Schema): unknown => {
  const type = typeof schema.type === 'string' ? schema.type.toLowerCase() : schema.type;
  switch (type) {
    case 'string': {
      const candidate = typeof value === 'string' ? value : '';
      if (schema.enum && schema.enum.length > 0) {
        return schema.enum.includes(candidate) ? candidate : schema.enum[0];
      }
      return candidate;
    }
    case 'number':
    case 'integer':
      if (typeof value === 'number' && Number.isFinite(value)) {
        return schema.type === 'integer' ? Math.trunc(value) : value;
      }
      return 0;
    case 'boolean':
      return typeof value === 'boolean' ? value : false;
    case 'array': {
      const itemsSchema = schema.items;
      if (!itemsSchema) return Array.isArray(value) ? value : [];
      if (!Array.isArray(value)) return [];
      return value.map((entry) => normalizeWithSchema(entry, itemsSchema));
    }
    case 'object': {
      const record = isPlainObject(value) ? value : {};
      const properties = schema.properties ?? {};
      const normalized: Record<string, unknown> = {};
      Object.entries(properties).forEach(([key, propSchema]) => {
        normalized[key] = normalizeWithSchema(record[key], propSchema);
      });
      return normalized;
    }
    default:
      return null;
  }
};

const normalizeLocally = <T>(text: string, schema: Schema | GenAiSchema): T => {
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  return normalizeWithSchema(parsed, coerceSchema(schema)) as T;
};

export const normalizeAiJson = async <T>(text: string, schema: Schema | GenAiSchema): Promise<T> => {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  const normalizedSchema = coerceSchema(schema);
  if (!token) {
    return normalizeLocally<T>(text, normalizedSchema);
  }

  try {
    const response = await fetch(AI_NORMALIZE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ text, schema: normalizedSchema })
    });
    if (!response.ok) {
      return normalizeLocally<T>(text, normalizedSchema);
    }
    const data = await response.json() as { data: T };
    return data.data;
  } catch {
    return normalizeLocally<T>(text, normalizedSchema);
  }
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
): Promise<GenerateContentResponse> => {
    const policy = await getCachedPolicy();
    if (policy?.tokenPolicy?.killSwitchEnabled) {
      throw new Error("AI generation is currently disabled.");
    }
    const ai = getAIClient();
    const model = APP_MODEL_CONFIG[appId] || 'gemini-flash-lite-latest';
    
    // 1. Telemetry: Track the request
    void systemCore.trackEvent({
      appId,
      context: 'generation',
      eventType: isRegen ? 'regenerate' : 'generate',
      label: isRegen ? 'regenerate' : 'generate'
    });

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
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: finalContents,
            config: finalConfig
        }));
        
        // Log completion for real metrics
        const outputLength = response.text?.length || 0;
        const inputLength = JSON.stringify(finalContents).length;
        void systemCore.trackEvent({
          appId,
          context: 'generation',
          eventType: 'performance',
          label: 'completion',
          meta: { inputLength, outputLength, latencyMs: Date.now() - start }
        });
        
        return response;
    } catch (e: any) {
        // Log failure
        void systemCore.trackEvent({
          appId,
          context: 'generation',
          eventType: 'error',
          label: 'generation_error',
          meta: { messageLength: typeof e?.message === 'string' ? e.message.length : 0 }
        });
        throw e;
    }
};
