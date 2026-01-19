import type { IncomingMessage, ServerResponse } from 'node:http';

const telemetryQueue: unknown[] = [];

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

export const handleIngest = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end();
    return;
  }

  let payload: unknown = null;
  try {
    payload = await readJsonBody(req);
  } catch {
    payload = null;
  }

  // Placeholder queue to decouple ingestion from downstream processing.
  telemetryQueue.push(payload);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true }));
};
