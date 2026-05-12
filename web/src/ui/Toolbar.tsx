import React from 'react';
import type { ToolType } from '@whiteboard/shared';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onlineUsers: number;
  connected: boolean;
  onExport: (format: 'png' | 'svg') => void;
  onAILayout: () => void;
  onAIMindMap: () => void;
  onAIDiagram: () => void;
}

const tools: { type: ToolType; icon: string; label: string; shortcut?: string }[] = [
  { type: 'select', icon: '⊹', label: 'Select', shortcut: 'V' },
  { type: 'hand', icon: '✋', label: 'Hand', shortcut: 'H' },
  { type: 'rectangle', icon: '▭', label: 'Rectangle', shortcut: 'R' },
  { type: 'ellipse', icon: '◯', label: 'Ellipse', shortcut: 'O' },
  { type: 'text', icon: 'T', label: 'Text', shortcut: 'T' },
  { type: 'pen', icon: '✎', label: 'Pen', shortcut: 'P' },
  { type: 'line', icon: '╱', label: 'Line', shortcut: 'L' },
  { type: 'frame', icon: '▣', label: 'Frame', shortcut: 'F' },
  { type: 'comment', icon: '💬', label: 'Comment', shortcut: 'C' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onlineUsers,
  connected,
  onExport,
  onAILayout,
  onAIMindMap,
  onAIDiagram,
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <span className="toolbar-brand">⚡ Whiteboard</span>
        <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '●' : '○'} {onlineUsers} online
        </span>
      </div>

      <div className="toolbar-section">
        {tools.map(tool => (
          <button
            key={tool.type}
            className={`tool-btn ${activeTool === tool.type ? 'active' : ''}`}
            onClick={() => onToolChange(tool.type)}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
          >
            <span className="tool-icon">{tool.icon}</span>
            <span className="tool-label">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-section">
        <button className="tool-btn" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          ↩
        </button>
        <button className="tool-btn" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          ↪
        </button>
      </div>

      <div className="toolbar-section">
        <div className="ai-dropdown">
          <button className="tool-btn ai-btn" title="AI Tools">
            🤖 AI
          </button>
          <div className="ai-dropdown-menu">
            <button onClick={onAILayout}>📐 Optimize Layout</button>
            <button onClick={onAIMindMap}>🧠 Generate Mind Map</button>
            <button onClick={onAIDiagram}>📊 Generate Flowchart</button>
          </div>
        </div>
      </div>

      <div className="toolbar-section">
        <button className="tool-btn" onClick={() => onExport('png')} title="Export PNG">
          📥 PNG
        </button>
        <button className="tool-btn" onClick={() => onExport('svg')} title="Export SVG">
          📥 SVG
        </button>
      </div>
    </div>
  );
};
