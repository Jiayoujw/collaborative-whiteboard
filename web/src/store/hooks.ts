import { useCallback, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { DocumentSchema } from './schema';
import { AwarenessManager, type AwarenessState } from './awareness';
import { UndoManager } from './undo';
import { CollaborationClient } from '../collaboration/sync';
import type { WhiteboardElement, Connection, Comment, Point } from '@whiteboard/shared';
import { nanoid } from 'nanoid';

export class WhiteboardStore {
  doc: Y.Doc;
  schema: DocumentSchema;
  awareness: AwarenessManager;
  undoManager: UndoManager;
  collabClient: CollaborationClient | null = null;
  private listeners: Set<() => void> = new Set();

  constructor(userId: string) {
    this.doc = new Y.Doc();
    this.schema = new DocumentSchema(this.doc);
    this.awareness = new AwarenessManager(userId);
    this.undoManager = new UndoManager(this.doc);

    this.doc.on('update', () => {
      this.listeners.forEach(l => l());
    });
  }

  connect(serverUrl: string, docId: string): void {
    if (this.collabClient) return;
    this.collabClient = new CollaborationClient(serverUrl, docId, this);
    this.collabClient.connect();
  }

  disconnect(): void {
    this.collabClient?.disconnect();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  getSnapshot = (): {
    elements: WhiteboardElement[];
    connections: Connection[];
    comments: Comment[];
    awarenessStates: Map<string, AwarenessState>;
  } => {
    return {
      elements: this.schema.getAllElements(),
      connections: this.schema.getAllConnections(),
      comments: this.schema.getAllComments(),
      awarenessStates: this.awareness.getAllStates(),
    };
  };

  addElement = (element: WhiteboardElement): void => {
    this.doc.transact(() => {
      this.schema.addElement(element);
    }, 'user-action');
  };

  updateElement = (id: string, updates: Partial<WhiteboardElement>): void => {
    this.doc.transact(() => {
      this.schema.updateElement(id, updates);
    }, 'user-action');
  };

  deleteElement = (id: string): void => {
    this.doc.transact(() => {
      this.schema.deleteElement(id);
    }, 'user-action');
  };

  addConnection = (connection: Connection): void => {
    this.doc.transact(() => {
      this.schema.addConnection(connection);
    }, 'user-action');
  };

  deleteConnection = (id: string): void => {
    this.doc.transact(() => {
      this.schema.deleteConnection(id);
    }, 'user-action');
  };

  addComment = (comment: Comment): void => {
    this.doc.transact(() => {
      this.schema.addComment(comment);
    }, 'user-action');
  };
}

function getWsUrl(): string {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  return 'ws://localhost:8080';
}

let globalStore: WhiteboardStore | null = null;

export function useWhiteboardStore(): WhiteboardStore {
  if (!globalStore) {
    const userId = `user_${nanoid(8)}`;
    globalStore = new WhiteboardStore(userId);
  }
  return globalStore;
}

export function useStoreSnapshot() {
  const store = useWhiteboardStore();
  const [snapshot, setSnapshot] = useState(store.getSnapshot());

  useEffect(() => {
    // Connect on mount
    store.connect(getWsUrl(), 'default');

    // Subscribe to changes
    const unsub = store.subscribe(() => {
      setSnapshot(store.getSnapshot());
    });

    return unsub;
  }, [store]);

  return snapshot;
}

export function useElements(): WhiteboardElement[] {
  const snapshot = useStoreSnapshot();
  return snapshot.elements;
}

export function useConnections(): Connection[] {
  const snapshot = useStoreSnapshot();
  return snapshot.connections;
}

export function useComments(): Comment[] {
  const snapshot = useStoreSnapshot();
  return snapshot.comments;
}

export function useRemoteUsers(): AwarenessState[] {
  const store = useWhiteboardStore();
  const [states, setStates] = useState<Map<string, AwarenessState>>(new Map());

  useEffect(() => {
    return store.awareness.onChange((newStates) => {
      setStates(new Map(newStates));
    });
  }, [store]);

  const localId = store.awareness.localState.userId;
  return Array.from(states.values()).filter(s => s.userId !== localId);
}
