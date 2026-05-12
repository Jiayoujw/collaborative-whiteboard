import type { HistorySnapshot } from '@whiteboard/shared';
import { Persistence } from './persist.js';

interface HistoryEntry {
  id: string;
  docId: string;
  timestamp: number;
  label: string;
  yjsState: Uint8Array;
}

export class HistoryManager {
  private snapshots: Map<string, HistoryEntry[]> = new Map();
  private persistence: Persistence;

  constructor(persistence: Persistence) {
    this.persistence = persistence;
  }

  createSnapshot(docId: string, yjsState: Uint8Array, label?: string): HistorySnapshot {
    const entries = this.getEntries(docId);
    const id = `snap_${Date.now()}_${entries.length}`;
    const snapshot: HistoryEntry = {
      id,
      docId,
      timestamp: Date.now(),
      label: label || `Snapshot ${entries.length + 1}`,
      yjsState,
    };
    entries.push(snapshot);

    if (entries.length > 50) {
      entries.shift();
    }

    this.snapshots.set(docId, entries);
    this.persistence.saveDoc(`history_${docId}`, {
      snapshots: entries.map(e => ({
        id: e.id,
        docId: e.docId,
        timestamp: e.timestamp,
        label: e.label,
        yjsState: Array.from(e.yjsState),
      })),
    });

    return { id, timestamp: snapshot.timestamp, label: snapshot.label };
  }

  getSnapshot(docId: string, snapshotId: string): HistoryEntry | null {
    return this.getEntries(docId).find(s => s.id === snapshotId) || null;
  }

  getSnapshots(docId: string): HistorySnapshot[] {
    return this.getEntries(docId).map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      label: e.label,
    }));
  }

  private getEntries(docId: string): HistoryEntry[] {
    if (!this.snapshots.has(docId)) {
      this.snapshots.set(docId, []);
    }
    return this.snapshots.get(docId)!;
  }
}
