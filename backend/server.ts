import { createServer } from 'node:http';
import { handleIngest } from './routes/ingest';
import { handleGenerate, handleStream, handleVideoGenerate, handleVideoProxy } from './routes/ai';

const server = createServer((req, res) => {
  if (req.url?.startsWith('/api/telemetry/ingest')) {
    void handleIngest(req, res);
    return;
  }

  if (req.url?.startsWith('/api/ai/generate')) {
    void handleGenerate(req, res);
    return;
  }

  if (req.url?.startsWith('/api/ai/stream')) {
    void handleStream(req, res);
    return;
  }

  if (req.url?.startsWith('/api/ai/videos')) {
    void handleVideoGenerate(req, res);
    return;
  }

  if (req.url?.startsWith('/api/ai/video')) {
    void handleVideoProxy(req, res);
    return;
  }

  res.statusCode = 404;
  res.end();
});

const port = Number(process.env.PORT) || 4000;
server.listen(port, () => {
  console.log(`Telemetry ingest listening on port ${port}`);
});
