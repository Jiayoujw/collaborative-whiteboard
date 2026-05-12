import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { WSSync } from './ws-server.js';
import { Persistence } from './persist.js';
import { HistoryManager } from './history.js';
import { WS_PORT } from '@whiteboard/shared';

const httpServer = createServer((_req, res) => {
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

httpServer.listen(WS_PORT, () => {
  console.log(`🚀 Whiteboard Sync Server running on ws://localhost:${WS_PORT}`);
  console.log(`   HTTP health check: http://localhost:${WS_PORT}`);
});
