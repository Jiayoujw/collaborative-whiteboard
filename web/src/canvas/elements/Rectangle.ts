import type { WhiteboardElement, Point } from '@whiteboard/shared';
import { pointInRect } from '@whiteboard/shared';
import { BaseElementRenderer } from './BaseElement';

export class RectangleRenderer extends BaseElementRenderer {
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

    this.applyStyle(ctx, element.style, element.opacity);

    if (element.style.shadow) {
      ctx.shadowColor = element.style.shadow.color;
      ctx.shadowOffsetX = element.style.shadow.offsetX;
      ctx.shadowOffsetY = element.style.shadow.offsetY;
      ctx.shadowBlur = element.style.shadow.blur;
    }

    const r = element.style.borderRadius * zoom;

    ctx.beginPath();
    if (r > 0) {
      ctx.moveTo(sx + r, sy);
      ctx.lineTo(sx + sw - r, sy);
      ctx.arcTo(sx + sw, sy, sx + sw, sy + r, r);
      ctx.lineTo(sx + sw, sy + sh - r);
      ctx.arcTo(sx + sw, sy + sh, sx + sw - r, sy + sh, r);
      ctx.lineTo(sx + r, sy + sh);
      ctx.arcTo(sx, sy + sh, sx, sy + sh - r, r);
      ctx.lineTo(sx, sy + r);
      ctx.arcTo(sx, sy, sx + r, sy, r);
    } else {
      ctx.rect(sx, sy, sw, sh);
    }
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
    return pointInRect(point, { x: element.x, y: element.y, width: element.width, height: element.height });
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
