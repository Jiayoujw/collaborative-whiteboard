import React from 'react';
import type { WhiteboardElement } from '@whiteboard/shared';
import { getElementRenderer } from '../canvas/elements';

interface LayersPanelProps {
  elements: WhiteboardElement[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  elements,
  selectedIds,
  onSelect,
  onDelete,
  onToggleVisibility,
  onToggleLock,
  onReorder,
}) => {
  const sorted = [...elements]
    .filter(el => el.visible)
    .sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="panel layers-panel">
      <h3 className="panel-title">Layers</h3>
      <div className="layers-list">
        {sorted.length === 0 && (
          <div className="layers-empty">No elements yet</div>
        )}
        {sorted.map(el => (
          <div
            key={el.id}
            className={`layer-item ${selectedIds.includes(el.id) ? 'selected' : ''}`}
            onClick={() => onSelect(el.id)}
          >
            <span className="layer-icon">
              {el.type === 'rectangle' ? '▭' :
               el.type === 'ellipse' ? '◯' :
               el.type === 'text' ? 'T' :
               el.type === 'frame' ? '▣' :
               el.type === 'pen-path' ? '✎' : '⊡'}
            </span>
            <span className="layer-name">
              {el.textContent?.text || el.type}
            </span>
            <div className="layer-actions">
              <button
                className="layer-btn"
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(el.id); }}
                title={el.visible ? 'Hide' : 'Show'}
              >
                {el.visible ? '👁' : '👁‍🗨'}
              </button>
              <button
                className="layer-btn"
                onClick={(e) => { e.stopPropagation(); onToggleLock(el.id); }}
                title={el.locked ? 'Unlock' : 'Lock'}
              >
                {el.locked ? '🔒' : '🔓'}
              </button>
              <button
                className="layer-btn"
                onClick={(e) => { e.stopPropagation(); onReorder(el.id, 'up'); }}
                title="Bring forward"
              >
                ↑
              </button>
              <button
                className="layer-btn"
                onClick={(e) => { e.stopPropagation(); onReorder(el.id, 'down'); }}
                title="Send backward"
              >
                ↓
              </button>
              <button
                className="layer-btn delete"
                onClick={(e) => { e.stopPropagation(); onDelete(el.id); }}
                title="Delete"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
