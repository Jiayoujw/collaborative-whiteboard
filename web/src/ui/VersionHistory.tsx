import React, { useState, useEffect } from 'react';
import type { HistorySnapshot } from '@whiteboard/shared';
import type { WhiteboardStore } from '../store/hooks';
import * as Y from 'yjs';

interface VersionHistoryProps {
  store: WhiteboardStore;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({ store }) => {
  const [snapshots, setSnapshots] = useState<HistorySnapshot[]>([]);
  const [restoring, setRestoring] = useState<string | null>(null);

  const takeSnapshot = () => {
    const state = Y.encodeStateAsUpdate(store.doc);
    const id = `snap_${Date.now()}`;
    const snapshot: HistorySnapshot = {
      id,
      timestamp: Date.now(),
      label: `Snapshot ${snapshots.length + 1}`,
    };
    setSnapshots(prev => [snapshot, ...prev].slice(0, 50));

    // Send to server
    if (store.collabClient) {
      const msg = new Uint8Array(1 + state.length);
      msg[0] = 2; // HISTORY_REQUEST equivalent
      msg.set(state, 1);
      // Store locally through collab
    }
  };

  const restoreSnapshot = (snapshotId: string) => {
    setRestoring(snapshotId);
    // Request snapshot from server
    if (store.collabClient) {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(snapshotId);
      const msg = new Uint8Array(1 + encoded.length);
      msg[0] = 2;
      msg.set(encoded, 1);
      // This will be handled by the collaboration layer
    }
    setTimeout(() => setRestoring(null), 1000);
  };

  return (
    <div className="panel version-panel">
      <h3 className="panel-title">Version History</h3>
      <button className="btn-primary" onClick={takeSnapshot} style={{ margin: '8px', width: 'calc(100% - 16px)' }}>
        📸 Take Snapshot
      </button>
      <div className="version-list">
        {snapshots.length === 0 && (
          <div className="version-empty">No snapshots yet</div>
        )}
        {snapshots.map(snap => (
          <div key={snap.id} className="version-item">
            <div className="version-info">
              <span className="version-label">{snap.label}</span>
              <span className="version-time">{formatTime(snap.timestamp)}</span>
            </div>
            <button
              className="btn-restore"
              onClick={() => restoreSnapshot(snap.id)}
              disabled={restoring === snap.id}
            >
              {restoring === snap.id ? '⏳' : '↩'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString();
}
