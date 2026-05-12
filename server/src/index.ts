import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { WSSync } from './ws-server.js';
import { Persistence } from './persist.js';
import { HistoryManager } from './history.js';
import { WS_PORT } from '@whiteboard/shared';

const PORT = parseInt(process.env.PORT || '') || WS_PORT;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const STATIC_DIR = join(process.cwd(), 'public');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const httpServer = createServer((req, res) => {
  const url = req.url || '/';

  // API health check
  if (url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', name: 'Whiteboard Sync Server', version: '1.0.0', production: IS_PRODUCTION }));
    return;
  }

  // Serve static files in production
  if (IS_PRODUCTION && url !== '/' && !url.startsWith('/ws')) {
    let filePath = join(STATIC_DIR, url === '/' ? 'index.html' : url);

    // SPA fallback - if file doesn't exist, serve index.html
    if (!existsSync(filePath)) {
      filePath = join(STATIC_DIR, 'index.html');
    }

    try {
      const ext = extname(filePath);
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
      });
      res.end(content);
      return;
    } catch {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
  }

  // Default response
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', name: 'Whiteboard Sync Server', version: '1.0.0' }));
});

const wss = new WebSocketServer({ server: httpServer });
const persistence = new Persistence();
const historyManager = new HistoryManager(persistence);
const syncService = new WSSync(persistence, historyManager);

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const docId = url.searchParams.get('doc') || 'default';
  const userId = url.searchParams.get('user') || 'anonymous';
  syncService.handleConnection(ws, docId, userId);
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Whiteboard Sync Server running on port ${PORT}`);
  console.log(`   WebSocket: ws://0.0.0.0:${PORT}`);
  console.log(`   HTTP: http://0.0.0.0:${PORT}`);
  if (IS_PRODUCTION) {
    console.log(`   Serving static files from: ${STATIC_DIR}`);
  }
});
