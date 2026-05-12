import React, { useRef, useEffect } from 'react';
import type { WhiteboardElement } from '@whiteboard/shared';
import { CANVAS_BACKGROUND } from '@whiteboard/shared';

interface MinimapProps {
  elements: WhiteboardElement[];
  viewportX: number;
  viewportY: number;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
  onNavigate: (x: number, y: number) => void;
}

const MINIMAP_SIZE = 200;

export const Minimap: React.FC<MinimapProps> = ({
  elements,
  viewportX,
  viewportY,
  zoom,
  canvasWidth,
  canvasHeight,
  onNavigate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = MINIMAP_SIZE * dpr;
    canvas.height = MINIMAP_SIZE * dpr;
    canvas.style.width = `${MINIMAP_SIZE}px`;
    canvas.style.height = `${MINIMAP_SIZE}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Background
    ctx.fillStyle = CANVAS_BACKGROUND;
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Find bounds of all elements
    if (elements.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
      if (!el.visible) continue;
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    }

    const boundsWidth = maxX - minX || 1000;
    const boundsHeight = maxY - minY || 1000;
    const scale = Math.min(MINIMAP_SIZE / boundsWidth, MINIMAP_SIZE / boundsHeight) * 0.85;
    const offsetX = (MINIMAP_SIZE - boundsWidth * scale) / 2 - minX * scale;
    const offsetY = (MINIMAP_SIZE - boundsHeight * scale) / 2 - minY * scale;

    // Draw elements
    for (const el of elements) {
      if (!el.visible) continue;
      ctx.fillStyle = el.style.fillColor;
      ctx.strokeStyle = el.style.strokeColor;
      ctx.lineWidth = 1;
      ctx.fillRect(
        el.x * scale + offsetX,
        el.y * scale + offsetY,
        el.width * scale,
        el.height * scale
      );
      ctx.strokeRect(
        el.x * scale + offsetX,
        el.y * scale + offsetY,
        el.width * scale,
        el.height * scale
      );
    }

    // Draw viewport rectangle
    const vpX = (-viewportX / zoom) * scale + offsetX;
    const vpY = (-viewportY / zoom) * scale + offsetY;
    const vpW = (canvasWidth / zoom) * scale;
    const vpH = (canvasHeight / zoom) * scale;

    ctx.strokeStyle = '#4d96ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      Math.max(0, vpX),
      Math.max(0, vpY),
      Math.min(vpW, MINIMAP_SIZE - vpX),
      Math.min(vpH, MINIMAP_SIZE - vpY)
    );
  }, [elements, viewportX, viewportY, zoom, canvasWidth, canvasHeight]);

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / MINIMAP_SIZE;
    const y = (e.clientY - rect.top) / MINIMAP_SIZE;

    // Calculate approximate canvas position
    // This is a simplified navigation
    onNavigate(-x * 5000, -y * 5000);
  };

  return (
    <div className="panel minimap-panel">
      <canvas ref={canvasRef} onClick={handleClick} style={{ cursor: 'pointer', borderRadius: 8 }} />
    </div>
  );
};
