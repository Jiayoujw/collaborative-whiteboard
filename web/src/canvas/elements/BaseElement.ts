import type { WhiteboardElement, ElementStyle, Point, Rect } from '@whiteboard/shared';
import { rotatePoint } from '@whiteboard/shared';

export abstract class BaseElementRenderer {
  abstract draw(
    ctx: CanvasRenderingContext2D,
    element: WhiteboardElement,
    selected: boolean,
    viewportX: number,
    viewportY: number,
    zoom: number
  ): void;

  abstract hitTest(element: WhiteboardElement, point: Point): boolean;

  abstract getResizeHandles(element: WhiteboardElement): Point[];

  protected applyStyle(ctx: CanvasRenderingContext2D, style: ElementStyle, opacity: number): void {
    ctx.globalAlpha = style.opacity * opacity;
    ctx.fillStyle = style.fillColor;
    ctx.strokeStyle = style.strokeColor;
    ctx.lineWidth = style.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  protected applyTransform(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    viewportX: number,
    viewportY: number,
    zoom: number
  ): void {
    const screenX = x * zoom + viewportX;
    const screenY = y * zoom + viewportY;
    const screenW = width * zoom;
    const screenH = height * zoom;

    ctx.save();
    if (rotation !== 0) {
      const cx = screenX + screenW / 2;
      const cy = screenY + screenH / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
    ctx.beginPath();
    ctx.rect(screenX, screenY, screenW, screenH);
    ctx.clip();
  }

  protected drawSelectionBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    viewportX: number,
    viewportY: number,
    zoom: number
  ): void {
    const screenX = x * zoom + viewportX;
    const screenY = y * zoom + viewportY;
    const screenW = width * zoom;
    const screenH = height * zoom;
    const handleSize = 8;

    ctx.save();
    if (rotation !== 0) {
      const cx = screenX + screenW / 2;
      const cy = screenY + screenH / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    ctx.strokeStyle = '#4d96ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(screenX, screenY, screenW, screenH);

    const handles = [
      { x: screenX, y: screenY },
      { x: screenX + screenW / 2, y: screenY },
      { x: screenX + screenW, y: screenY },
      { x: screenX + screenW, y: screenY + screenH / 2 },
      { x: screenX + screenW, y: screenY + screenH },
      { x: screenX + screenW / 2, y: screenY + screenH },
      { x: screenX, y: screenY + screenH },
      { x: screenX, y: screenY + screenH / 2 },
    ];

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#4d96ff';
    ctx.lineWidth = 1.5;
    for (const h of handles) {
      ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
    }

    ctx.restore();
  }
}
