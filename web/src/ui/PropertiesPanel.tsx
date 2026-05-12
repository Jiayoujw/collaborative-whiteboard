import React, { useState, useEffect } from 'react';
import type { WhiteboardElement, ElementStyle, TextContent } from '@whiteboard/shared';
import { COLORS_PALETTE } from '@whiteboard/shared';

interface PropertiesPanelProps {
  element: WhiteboardElement | null;
  onUpdate: (id: string, updates: Partial<WhiteboardElement>) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ element, onUpdate }) => {
  if (!element) {
    return (
      <div className="panel properties-panel">
        <h3 className="panel-title">Properties</h3>
        <div className="properties-empty">Select an element to edit</div>
      </div>
    );
  }

  return (
    <div className="panel properties-panel">
      <h3 className="panel-title">Properties</h3>
      <div className="properties-content">
        <Section title="Position & Size">
          <div className="prop-row">
            <label>X</label>
            <input type="number" value={Math.round(element.x)} onChange={e => onUpdate(element.id, { x: +e.target.value })} />
          </div>
          <div className="prop-row">
            <label>Y</label>
            <input type="number" value={Math.round(element.y)} onChange={e => onUpdate(element.id, { y: +e.target.value })} />
          </div>
          <div className="prop-row">
            <label>W</label>
            <input type="number" value={Math.round(element.width)} min={1} onChange={e => onUpdate(element.id, { width: Math.max(1, +e.target.value) })} />
          </div>
          <div className="prop-row">
            <label>H</label>
            <input type="number" value={Math.round(element.height)} min={1} onChange={e => onUpdate(element.id, { height: Math.max(1, +e.target.value) })} />
          </div>
          <div className="prop-row">
            <label>Rotation</label>
            <input type="number" value={element.rotation} onChange={e => onUpdate(element.id, { rotation: +e.target.value })} />
          </div>
          <div className="prop-row">
            <label>Opacity</label>
            <input type="range" min={0} max={1} step={0.05} value={element.opacity} onChange={e => onUpdate(element.id, { opacity: +e.target.value })} />
          </div>
        </Section>

        <Section title="Style">
          <div className="prop-row">
            <label>Fill</label>
            <div className="color-picker-row">
              <input type="color" value={element.style.fillColor} onChange={e => onUpdate(element.id, { style: { ...element.style, fillColor: e.target.value } })} />
              <div className="color-palette">
                {COLORS_PALETTE.slice(0, 8).map(c => (
                  <button key={c} className="color-swatch" style={{ background: c }} onClick={() => onUpdate(element.id, { style: { ...element.style, fillColor: c } })} />
                ))}
              </div>
            </div>
          </div>
          <div className="prop-row">
            <label>Stroke</label>
            <input type="color" value={element.style.strokeColor} onChange={e => onUpdate(element.id, { style: { ...element.style, strokeColor: e.target.value } })} />
          </div>
          <div className="prop-row">
            <label>Border W</label>
            <input type="number" value={element.style.strokeWidth} min={0} max={20} onChange={e => onUpdate(element.id, { style: { ...element.style, strokeWidth: +e.target.value } })} />
          </div>
          <div className="prop-row">
            <label>Radius</label>
            <input type="number" value={element.style.borderRadius} min={0} max={100} onChange={e => onUpdate(element.id, { style: { ...element.style, borderRadius: +e.target.value } })} />
          </div>
        </Section>

        {element.textContent && (
          <Section title="Text">
            <div className="prop-row">
              <label>Content</label>
              <textarea value={element.textContent.text} onChange={e => onUpdate(element.id, { textContent: { ...element.textContent!, text: e.target.value } })} />
            </div>
            <div className="prop-row">
              <label>Font Size</label>
              <input type="number" value={element.textContent.fontSize} min={8} max={200} onChange={e => onUpdate(element.id, { textContent: { ...element.textContent!, fontSize: +e.target.value } })} />
            </div>
            <div className="prop-row">
              <label>Color</label>
              <input type="color" value={element.textContent.color} onChange={e => onUpdate(element.id, { textContent: { ...element.textContent!, color: e.target.value } })} />
            </div>
          </Section>
        )}
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="prop-section">
      <div className="prop-section-header" onClick={() => setOpen(!open)}>
        {title} <span>{open ? '▾' : '▸'}</span>
      </div>
      {open && <div className="prop-section-content">{children}</div>}
    </div>
  );
};
