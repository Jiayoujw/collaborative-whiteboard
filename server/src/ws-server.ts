import { WebSocket } from 'ws';
import * as Y from 'yjs';
import { Persistence } from './persist.js';
import { HistoryManager } from './history.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toUint8Array(data: any): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (Array.isArray(data)) return new Uint8Array(data);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (Buffer.isBuffer(data)) return new Uint8Array(data);
  return encoder.encode(JSON.stringify(data));
}

function toBuffer(data: Uint8Array): Buffer {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}

interface Client {
  ws: WebSocket;
  userId: string;
  docId: string;
  doc: Y.Doc;
}

export class WSSync {
  private docs: Map<string, { doc: Y.Doc; clients: Set<Client> }> = new Map();
  private persistence: Persistence;
  private history: HistoryManager;

  constructor(persistence: Persistence, history: HistoryManager) {
    this.persistence = persistence;
    this.history = history;
  }

  handleConnection(ws: WebSocket, docId: string, userId: string): void {
    const docEntry = this.getOrCreateDoc(docId);
    const client: Client = { ws, userId, docId, doc: docEntry.doc };
    docEntry.clients.add(client);

    console.log(`👤 ${userId} joined "${docId}" (${docEntry.clients.size} users)`);

    // Send initial sync state
    const syncStep1 = Y.encodeStateAsUpdate(docEntry.doc);
    ws.send(toBuffer(syncStep1), { binary: true });

    // Send awareness of existing users
    this.broadcastAwareness(docId);

    ws.on('message', (data: Buffer) => {
      try {
        const msg = new Uint8Array(data);
        this.handleMessage(client, msg);
      } catch (err) {
        console.error('Message error:', err);
      }
    });

    ws.on('close', () => {
      docEntry.clients.delete(client);
      console.log(`👋 ${userId} left "${docId}" (${docEntry.clients.size} users)`);

      if (docEntry.clients.size === 0) {
        this.saveDoc(docId, docEntry.doc);
      }

      this.broadcastAwareness(docId);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  }

  private handleMessage(client: Client, msg: Uint8Array): void {
    const msgType = msg[0];

    switch (msgType) {
      case 0: { // SYNC (Yjs update)
        const update = msg.slice(1);
        Y.applyUpdate(client.doc, update);
        this.broadcastToOthers(client, msg);
        break;
      }
      case 1: { // AWARENESS
        this.broadcastToOthers(client, msg);
        break;
      }
      case 2: { // HISTORY_REQUEST
        const snapshotId = decoder.decode(msg.slice(1));
        const snapshot = this.history.getSnapshot(client.docId, snapshotId);
        if (snapshot) {
          const response = new Uint8Array(1 + snapshot.yjsState.length);
          response[0] = 3; // HISTORY_RESPONSE
          response.set(snapshot.yjsState, 1);
          client.ws.send(toBuffer(response), { binary: true });
        }
        break;
      }
      default:
        console.warn(`Unknown message type: ${msgType}`);
    }
  }

  private broadcastToOthers(sender: Client, msg: Uint8Array): void {
    const docEntry = this.docs.get(sender.docId);
    if (!docEntry) return;

    const buf = toBuffer(msg);
    for (const client of docEntry.clients) {
      if (client !== sender && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(buf, { binary: true });
      }
    }
  }

  private broadcastAwareness(docId: string): void {
    const docEntry = this.docs.get(docId);
    if (!docEntry) return;

    const users = Array.from(docEntry.clients).map(c => ({
      id: c.userId,
    }));

    const msg = encoder.encode(JSON.stringify({ type: 'presence', users }));
    for (const client of docEntry.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(toBuffer(msg), { binary: false });
      }
    }
  }

  private getOrCreateDoc(docId: string): { doc: Y.Doc; clients: Set<Client> } {
    if (!this.docs.has(docId)) {
      const doc = new Y.Doc();
      const stored = this.persistence.getDoc(docId);
      if (stored?.yjsState) {
        Y.applyUpdate(doc, stored.yjsState);
      }
      this.docs.set(docId, { doc, clients: new Set() });

      // Auto-save every 30 seconds
      setInterval(() => {
        this.saveDoc(docId, doc);
        this.history.createSnapshot(docId, Y.encodeStateAsUpdate(doc));
      }, 30000);
    }
    return this.docs.get(docId)!;
  }

  private saveDoc(docId: string, doc: Y.Doc): void {
    const state = Y.encodeStateAsUpdate(doc);
    this.persistence.saveDoc(docId, {
      yjsState: state,
      id: docId,
      updatedAt: Date.now(),
    } as any);
  }
}
