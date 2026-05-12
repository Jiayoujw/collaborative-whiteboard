import type { WhiteboardElement, Point } from '@whiteboard/shared';
import { pointInRect } from '@whiteboard/shared';
import { BaseElementRenderer } from './BaseElement';

export class FrameRenderer extends BaseElementRenderer {
  draw(
    ctx: CanvasRenderingContext2D,
    element: WhiteboardElement,
    selected: boolean,
    viewportX: number,
    viewportY: number,
    zoom: number
  ): void {
    const sx = element.x * zoom + viewportX;
    const sy = element.y * zoom + viewportY;
    const sw = element.width * zoom;
    const sh = element.height * zoom;

    this.applyTransform(ctx, element.x, element.y, element.width, element.height, element.rotation, viewportX, viewportY, zoom);

    // Frame background
    ctx.fillStyle = element.style.fillColor + '40'; // semi-transparent
    ctx.fillRect(sx, sy, sw, sh);

    // Frame border
    ctx.strokeStyle = element.style.strokeColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.setLineDash([]);

    // Frame title
    ctx.fillStyle = '#666';
    ctx.font = `${12 * zoom}px Inter, system-ui, sans-serif`;
    ctx.fillText(element.textContent?.text || 'Frame', sx + 8 * zoom, sy - 6 * zoom);

    ctx.restore();

    if (selected) {
      this.drawSelectionBox(ctx, element.x, element.y, element.width, element.height, element.rotation, viewportX, viewportY, zoom);
    }
  }

  hitTest(element: WhiteboardElement, point: Point): boolean {
    return pointInRect(point, { x: element.x, y: element.y, width: element.width, height: element.height });
  }

  getResizeHandles(element: WhiteboardElement): Point[] {
    const { x, y, width, height } = element;
    return [
      { x, y }, { x: x + width / 2, y }, { x: x + width, y },
      { x: x + width, y: y + height / 2 }, { x: x + width, y: y + height },
      { x: x + width / 2, y: y + height }, { x, y: y + height }, { x, y: y + height / 2 },
    ];
  }
}
