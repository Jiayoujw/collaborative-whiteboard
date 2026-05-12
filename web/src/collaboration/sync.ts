import * as Y from 'yjs';
import { WSClient } from './ws';
import type { WhiteboardStore } from '../store/hooks';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class CollaborationClient {
  wsClient: WSClient;
  private store: WhiteboardStore;
  private unsubs: (() => void)[] = [];
  private synced = false;

  constructor(serverUrl: string, docId: string, store: WhiteboardStore) {
    const wsUrl = serverUrl.replace(/^http/, 'ws') + `?doc=${docId}&user=${store.awareness.localState.userId}`;
    this.wsClient = new WSClient(wsUrl);
    this.store = store;
  }

  connect(): void {
    this.wsClient.connect();

    // Handle incoming messages
    const unsubMsg = this.wsClient.onMessage((data) => {
      this.handleMessage(data);
    });
    this.unsubs.push(unsubMsg);

    // Send local Yjs updates
    const unsubUpdate = this.store.doc.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== 'remote') {
        const msg = new Uint8Array(1 + update.length);
        msg[0] = 0; // SYNC
        msg.set(update, 1);
        this.wsClient.send(msg);
      }
    });
    this.unsubs.push(() => { /* Yjs doesn't support unsub easily */ });

    // Send awareness changes
    const unsubAwareness = this.store.awareness.onChange((states) => {
      const data = JSON.stringify({
        type: 'awareness',
        states: Array.from(states.entries()).map(([, s]) => s),
      });
      const encoded = encoder.encode(data);
      const msg = new Uint8Array(1 + encoded.length);
      msg[0] = 1; // AWARENESS
      msg.set(encoded, 1);
      this.wsClient.send(msg);
    });
    this.unsubs.push(unsubAwareness);
  }

  private handleMessage(data: Uint8Array): void {
    if (data.length === 0) return;

    const msgType = data[0];
    const payload = data.slice(1);

    switch (msgType) {
      case 0: { // SYNC (Yjs update from server)
        Y.applyUpdate(this.store.doc, payload, 'remote');
        if (!this.synced) {
          this.synced = true;
          console.log('📄 Document synced');
        }
        break;
      }
      case 1: { // AWARENESS
        try {
          const text = decoder.decode(payload);
          const parsed = JSON.parse(text);

          if (parsed.type === 'presence') {
            // Server-sent presence list
            for (const user of parsed.users) {
              if (user.id !== this.store.awareness.localState.userId) {
                this.store.awareness.addRemoteUser(user.id, user.name || 'Anonymous');
              }
            }
          } else if (parsed.type === 'awareness') {
            // Peer-sent awareness update
            for (const state of parsed.states) {
              if (state.userId !== this.store.awareness.localState.userId) {
                this.store.awareness.updateRemoteState(state.userId, state);
              }
            }
          }
        } catch (err) {
          // Binary awareness data - skip for now
        }
        break;
      }
      case 3: { // HISTORY_RESPONSE
        // Handle history snapshot response
        try {
          Y.applyUpdate(this.store.doc, payload, 'remote');
        } catch (err) {
          console.error('Error applying history snapshot:', err);
        }
        break;
      }
      default:
        break;
    }
  }

  disconnect(): void {
    this.unsubs.forEach(unsub => unsub());
    this.unsubs = [];
    this.wsClient.disconnect();
  }
}
