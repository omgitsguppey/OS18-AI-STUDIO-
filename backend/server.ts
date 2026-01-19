import { createServer } from 'node:http';
import { handleIngest } from './routes/ingest';

const server = createServer((req, res) => {
  if (req.url?.startsWith('/api/telemetry/ingest')) {
    void handleIngest(req, res);
    return;
  }

  res.statusCode = 404;
  res.end();
});

const port = Number(process.env.PORT) || 4000;
server.listen(port, () => {
  console.log(`Telemetry ingest listening on port ${port}`);
});
