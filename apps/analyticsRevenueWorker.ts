import { Type } from "@google/genai";
import { AppID } from "../types";
import { APP_MODEL_CONFIG, getAIClient } from "../services/ai/core";
import { LocalIntelligence } from "../services/localIntelligence";
import type { RevenueRecord } from "../services/geminiService";

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const parseRevenueFileInWorker = async (file: File): Promise<Omit<RevenueRecord, 'id'>[]> => {
  // Heuristic parsing stays in the worker to keep the UI thread responsive.
  if (file.type === "text/csv" || file.type === "text/plain" || file.name.endsWith('.csv')) {
    const text = await file.text();
    const records = LocalIntelligence.parseCSV(text);
    if (records.length > 0) return records;
  }

  const ai = getAIClient();
  const base64Data = arrayBufferToBase64(await file.arrayBuffer());

  const systemInstruction = `Extract revenue data from this document.
  Return JSON array with: date (YYYY-MM-DD), label, trackTitle, artist, platform, revenueAmount (number), currency.`;

  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.ANALYTICS_AI],
    contents: {
      role: 'user',
      parts: [
        { inlineData: { mimeType: file.type || 'text/plain', data: base64Data } },
        { text: "Extract revenue records." }
      ]
    },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            label: { type: Type.STRING },
            trackTitle: { type: Type.STRING },
            artist: { type: Type.STRING },
            platform: { type: Type.STRING },
            revenueAmount: { type: Type.NUMBER },
            currency: { type: Type.STRING }
          },
          required: ['date', 'label', 'trackTitle', 'artist', 'platform', 'revenueAmount', 'currency']
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
};

self.onmessage = async (event: MessageEvent) => {
  const { file } = event.data || {};
  if (!file) {
    self.postMessage({ error: 'Missing file payload.' });
    return;
  }

  try {
    const records = await parseRevenueFileInWorker(file);
    self.postMessage({ records });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Failed to parse file.' });
  }
};
