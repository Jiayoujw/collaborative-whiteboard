import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { WhiteboardElement, Connection, Comment } from '@whiteboard/shared';

interface StoredDoc {
  id: string;
  name: string;
  elements: Record<string, WhiteboardElement>;
  connections: Record<string, Connection>;
  comments: Record<string, Comment>;
  yjsState: Uint8Array | null;
  updatedAt: number;
}

const DATA_DIR = join(process.cwd(), 'data');

export class Persistence {
  private cache: Map<string, StoredDoc> = new Map();

  constructor() {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    this.loadAll();
  }

  private filePath(docId: string): string {
    return join(DATA_DIR, `${docId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
  }

  private loadAll(): void {
    try {
      const files = readdirSyncSafe(DATA_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const data: StoredDoc = JSON.parse(
              readFileSync(join(DATA_DIR, file), 'utf-8')
            );
            if (data.yjsState) {
              data.yjsState = new Uint8Array(Object.values(data.yjsState));
            }
            this.cache.set(data.id, data);
          } catch { /* skip corrupt files */ }
        }
      }
    } catch { /* dir might not exist yet */ }
    console.log(`📦 Loaded ${this.cache.size} documents from disk`);
  }

  getDoc(docId: string): StoredDoc | null {
    if (this.cache.has(docId)) return this.cache.get(docId)!;
    const path = this.filePath(docId);
    if (existsSync(path)) {
      const data: StoredDoc = JSON.parse(readFileSync(path, 'utf-8'));
      if (data.yjsState) {
        data.yjsState = new Uint8Array(Object.values(data.yjsState));
      }
      this.cache.set(docId, data);
      return data;
    }
    return null;
  }

  saveDoc(docId: string, data: Partial<StoredDoc> & Record<string, any>): void {
    const existing = this.getDoc(docId) || {
      id: docId,
      name: 'Untitled',
      elements: {},
      connections: {},
      comments: {},
      yjsState: null,
      updatedAt: Date.now(),
    };
    const merged: StoredDoc = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };
    if (merged.yjsState instanceof Uint8Array) {
      const temp = merged.yjsState;
      (merged as any).yjsState = Array.from(temp) as any;
    }
    this.cache.set(docId, merged);
    writeFileSync(this.filePath(docId), JSON.stringify(merged, null, 2));
    if (merged.yjsState) {
      (merged as any).yjsState = new Uint8Array(Object.values((merged as any).yjsState));
    }
  }

  getDocIds(): string[] {
    return Array.from(this.cache.keys());
  }
}

function readdirSyncSafe(dir: string): string[] {
  try { return require('fs').readdirSync(dir); } catch { return []; }
}
