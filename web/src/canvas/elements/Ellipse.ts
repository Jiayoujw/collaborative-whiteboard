import type { WhiteboardElement, Point } from '@whiteboard/shared';
import { BaseElementRenderer } from './BaseElement';

export class EllipseRenderer extends BaseElementRenderer {
  draw(
    ctx: CanvasRenderingContext2D,
    element: WhiteboardElement,
    selected: boolean,
    viewportX: number,
    viewportY: number,
    zoom: number
  ): void {
    this.applyTransform(ctx, element.x, element.y, element.width, element.height, element.rotation, viewportX, viewportY, zoom);
    this.applyStyle(ctx, element.style, element.opacity);

    const cx = (element.x + element.width / 2) * zoom + viewportX;
    const cy = (element.y + element.height / 2) * zoom + viewportY;
    const rx = (element.width / 2) * zoom;
    const ry = (element.height / 2) * zoom;

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    if (element.style.strokeWidth > 0) {
      ctx.stroke();
    }

    ctx.restore();

    if (selected) {
      this.drawSelectionBox(ctx, element.x, element.y, element.width, element.height, element.rotation, viewportX, viewportY, zoom);
    }
  }

  hitTest(element: WhiteboardElement, point: Point): boolean {
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    const rx = element.width / 2;
    const ry = element.height / 2;
    const dx = (point.x - cx) / rx;
    const dy = (point.y - cy) / ry;
    return dx * dx + dy * dy <= 1;
  }

  getResizeHandles(element: WhiteboardElement): Point[] {
    const { x, y, width, height } = element;
    return [
      { x, y },
      { x: x + width / 2, y },
      { x: x + width, y },
      { x: x + width, y: y + height / 2 },
      { x: x + width, y: y + height },
      { x: x + width / 2, y: y + height },
      { x, y: y + height },
      { x, y: y + height / 2 },
    ];
  }
}
