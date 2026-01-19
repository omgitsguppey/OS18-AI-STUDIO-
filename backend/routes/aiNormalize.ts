import type { IncomingMessage, ServerResponse } from 'node:http';
import admin from 'firebase-admin';

const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_SCHEMA_DEPTH = 6;
const MAX_SCHEMA_PROPERTIES = 200;
const MAX_ARRAY_ITEMS = 200;

type Schema =
  | { type: 'string'; enum?: string[] }
  | { type: 'number' | 'integer' }
  | { type: 'boolean' }
  | { type: 'object'; properties?: Record<string, Schema> }
  | { type: 'array'; items?: Schema };

type JsonPayload = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const extractBearerToken = (headerValue: string | undefined): string | null => {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

const readJsonBody = (req: IncomingMessage): Promise<JsonPayload | null> =>
  new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_PAYLOAD_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (!body) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(isPlainObject(parsed) ? parsed : null);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });

const sanitizeSchema = (
  raw: unknown,
  depth = 0,
  counter = { count: 0 }
): Schema | null => {
  if (!isPlainObject(raw) || depth > MAX_SCHEMA_DEPTH) return null;
  const type = typeof raw.type === 'string' ? raw.type.toLowerCase() : raw.type;
  if (type === 'string') {
    const enumValues = Array.isArray(raw.enum)
      ? raw.enum.filter((value) => typeof value === 'string')
      : undefined;
    return { type: 'string', enum: enumValues };
  }
  if (type === 'number' || type === 'integer') return { type: type === 'integer' ? 'integer' : 'number' };
  if (type === 'boolean') return { type: 'boolean' };
  if (type === 'array') {
    return { type: 'array', items: sanitizeSchema(raw.items, depth + 1, counter) || undefined };
  }
  if (type === 'object') {
    const propertiesRaw = isPlainObject(raw.properties) ? raw.properties : {};
    const properties: Record<string, Schema> = {};
    for (const [key, value] of Object.entries(propertiesRaw)) {
      if (counter.count >= MAX_SCHEMA_PROPERTIES) break;
      const schema = sanitizeSchema(value, depth + 1, counter);
      if (!schema) continue;
      properties[key] = schema;
      counter.count += 1;
    }
    return { type: 'object', properties };
  }
  return null;
};

const normalizeWithSchema = (value: unknown, schema: Schema): unknown => {
  switch (schema.type) {
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
      if (!itemsSchema) return Array.isArray(value) ? value.slice(0, MAX_ARRAY_ITEMS) : [];
      if (!Array.isArray(value)) return [];
      return value.slice(0, MAX_ARRAY_ITEMS).map((entry) => normalizeWithSchema(entry, itemsSchema));
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

if (!admin.apps.length) {
  admin.initializeApp();
}

export const handleAiNormalize = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end();
    return;
  }

  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.statusCode = 401;
    res.end();
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    if (!decoded.uid) {
      res.statusCode = 401;
      res.end();
      return;
    }
  } catch (error) {
    console.warn('AI normalize auth verification failed', error);
    res.statusCode = 401;
    res.end();
    return;
  }

  let payload: JsonPayload | null = null;
  try {
    payload = await readJsonBody(req);
  } catch {
    res.statusCode = 400;
    res.end();
    return;
  }

  if (!payload) {
    res.statusCode = 400;
    res.end();
    return;
  }

  const rawSchema = payload.schema;
  const schema = sanitizeSchema(rawSchema);
  if (!schema) {
    res.statusCode = 400;
    res.end();
    return;
  }

  const rawText = typeof payload.text === 'string' ? payload.text : '';
  let parsed: unknown = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = null;
  }

  const normalized = normalizeWithSchema(parsed, schema);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ data: normalized }));
};
