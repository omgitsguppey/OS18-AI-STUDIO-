import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { GoogleGenAI } from '@google/genai';

interface GenerateRequest {
  model: string;
  contents: unknown;
  config?: unknown;
}

interface VideoRequest {
  model: string;
  prompt: string;
  config?: unknown;
}

const readJsonBody = (req: IncomingMessage): Promise<unknown> => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    if (!body) {
      resolve(null);
      return;
    }
    try {
      resolve(JSON.parse(body));
    } catch (error) {
      reject(error);
    }
  });
  req.on('error', reject);
});

const getApiKey = () => process.env.GEMINI_API_KEY || process.env.API_KEY || '';

const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY.');
  }
  return new GoogleGenAI({ apiKey });
};

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const parseGenerateRequest = (payload: unknown): GenerateRequest | null => {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as { model?: unknown; contents?: unknown; config?: unknown };
  if (typeof data.model !== 'string' || !data.model.trim()) return null;
  if (data.contents === undefined || data.contents === null) return null;
  return { model: data.model, contents: data.contents, config: data.config };
};

const parseVideoRequest = (payload: unknown): VideoRequest | null => {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as { model?: unknown; prompt?: unknown; config?: unknown };
  if (typeof data.model !== 'string' || !data.model.trim()) return null;
  if (typeof data.prompt !== 'string' || !data.prompt.trim()) return null;
  return { model: data.model, prompt: data.prompt, config: data.config };
};

export const handleGenerate = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  let payload: unknown = null;
  try {
    payload = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON payload.' });
    return;
  }

  const request = parseGenerateRequest(payload);
  if (!request) {
    sendJson(res, 400, { error: 'Invalid request payload.' });
    return;
  }

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: request.model,
      contents: request.contents,
      config: request.config
    });

    sendJson(res, 200, {
      text: response.text || '',
      candidates: response.candidates || []
    });
  } catch (error) {
    console.error('AI generate failed', error);
    sendJson(res, 500, { error: 'AI generation failed.' });
  }
};

export const handleStream = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  let payload: unknown = null;
  try {
    payload = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON payload.' });
    return;
  }

  const request = parseGenerateRequest(payload);
  if (!request) {
    sendJson(res, 400, { error: 'Invalid request payload.' });
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');

  try {
    const ai = getClient();
    const responseStream = await ai.models.generateContentStream({
      model: request.model,
      contents: request.contents,
      config: request.config
    });

    for await (const chunk of responseStream) {
      const text = typeof chunk.text === 'string' ? chunk.text : '';
      const candidates = Array.isArray(chunk.candidates) ? chunk.candidates : [];
      res.write(`${JSON.stringify({ text, candidates })}\n`);
    }

    res.write(`${JSON.stringify({ done: true })}\n`);
    res.end();
  } catch (error) {
    console.error('AI stream failed', error);
    res.write(`${JSON.stringify({ error: 'AI stream failed.' })}\n`);
    res.end();
  }
};

export const handleVideoGenerate = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  let payload: unknown = null;
  try {
    payload = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON payload.' });
    return;
  }

  const request = parseVideoRequest(payload);
  if (!request) {
    sendJson(res, 400, { error: 'Invalid request payload.' });
    return;
  }

  try {
    const ai = getClient();
    let operation = await ai.models.generateVideos({
      model: request.model,
      prompt: request.prompt,
      config: request.config
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    const proxyUrl = videoUri ? `/api/ai/video?uri=${encodeURIComponent(videoUri)}` : null;

    sendJson(res, 200, { proxyUrl });
  } catch (error) {
    console.error('AI video generation failed', error);
    sendJson(res, 500, { error: 'AI video generation failed.' });
  }
};

export const handleVideoProxy = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  const origin = `http://${req.headers.host || 'localhost'}`;
  const url = new URL(req.url || '', origin);
  const uri = url.searchParams.get('uri');
  if (!uri) {
    res.statusCode = 400;
    res.end('Missing uri');
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    res.statusCode = 400;
    res.end('Invalid uri');
    return;
  }

  if (parsed.protocol !== 'https:') {
    res.statusCode = 400;
    res.end('Invalid uri protocol');
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    res.statusCode = 500;
    res.end('Missing API key');
    return;
  }

  if (!parsed.searchParams.has('key')) {
    parsed.searchParams.set('key', apiKey);
  }
  const upstreamUrl = parsed.toString();

  try {
    const upstream = await fetch(upstreamUrl);
    res.statusCode = upstream.status;
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    if (!upstream.body) {
      res.end();
      return;
    }

    const stream = Readable.fromWeb(upstream.body as any);
    stream.pipe(res);
  } catch (error) {
    console.error('AI video proxy failed', error);
    res.statusCode = 500;
    res.end('Video proxy failed');
  }
};
