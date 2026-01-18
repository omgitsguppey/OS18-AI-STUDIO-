
import { Modality } from "@google/genai";
import { getAIClient, APP_MODEL_CONFIG } from "./core";
import { AppID } from "../../types";

// Declare global lamejs type
declare global {
  interface Window {
    lamejs: {
      Mp3Encoder: new (channels: number, samplerate: number, kbps: number) => any;
    };
  }
}

export interface SpeechGeneration {
  id: string;
  text: string;
  voice: string;
  audioBase64: string; // Stored as base64 string of MP3 file
  timestamp: number;
  duration?: number;
}

export const generateSpeech = async (
  text: string,
  voice: string,
  speed: number, // 0.5 to 2.0 (simulated via prompt)
  stability: number, // 0 to 1 (mapped to temperature, inv)
  tone: string // "Neutral", "Happy", "Serious", etc.
): Promise<SpeechGeneration> => {
  const ai = getAIClient();
  
  // Prompt Engineering to simulate Speed and Tone
  // Stability controls temperature (High stability = Low temperature)
  const temperature = 1 - stability; // 0.0 (stable) to 1.0 (variable)
  
  const speedInstruction = speed < 0.8 ? "Speak slowly and clearly." : speed > 1.2 ? "Speak quickly and energetically." : "Speak at a normal, conversational pace.";
  const toneInstruction = tone !== 'Neutral' ? `Voice Tone: ${tone}.` : "";
  
  const prompt = `${toneInstruction} ${speedInstruction} \n\n${text}`;

  const response = await ai.models.generateContent({
    model: APP_MODEL_CONFIG[AppID.SPEECH_AI],
    contents: {
        parts: [{ text: prompt }]
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice }
        }
      },
      temperature: temperature
    }
  });

  const base64PCM = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (!base64PCM) {
      throw new Error("No audio data returned");
  }

  // Convert PCM to MP3
  const mp3Base64 = await convertPcmToMp3(base64PCM);

  return {
    id: Date.now().toString(),
    text,
    voice,
    audioBase64: mp3Base64,
    timestamp: Date.now()
  };
};

// Helper: Convert Base64 PCM (24kHz typically) to MP3
const convertPcmToMp3 = async (base64PCM: string): Promise<string> => {
  // 1. Decode Base64 to ArrayBuffer
  const binaryString = atob(base64PCM);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Gemini TTS usually returns raw PCM.
  // We assume 24kHz Mono 16-bit based on typical Gemini TTS output.
  const sampleRate = 24000;
  const channels = 1;
  const kbps = 128;

  // Convert Uint8Array to Int16Array
  const int16Data = new Int16Array(bytes.buffer);

  // Initialize LameJS Encoder from Window object (Script Tag)
  if (!window.lamejs || !window.lamejs.Mp3Encoder) {
      throw new Error("MP3 Encoder library not loaded correctly. Please check internet connection.");
  }

  const mp3encoder = new window.lamejs.Mp3Encoder(channels, sampleRate, kbps);
  const mp3Data = [];
  
  // Encode in chunks
  const sampleBlockSize = 1152; // multiple of 576
  for (let i = 0; i < int16Data.length; i += sampleBlockSize) {
    const sampleChunk = int16Data.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  
  // Flush
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }

  // Create Blob
  const blob = new Blob(mp3Data, { type: 'audio/mp3' });
  
  // Convert Blob back to Base64 for storage
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          const res = reader.result as string;
          // remove data:audio/mp3;base64, prefix
          resolve(res.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
  });
};
