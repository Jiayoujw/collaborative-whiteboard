import type { WhiteboardElement, Point } from '@whiteboard/shared';
import { distance, getBoundingBox } from '@whiteboard/shared';
import { BaseElementRenderer } from './BaseElement';

export class PenPathRenderer extends BaseElementRenderer {
  draw(
    ctx: CanvasRenderingContext2D,
    element: WhiteboardElement,
    selected: boolean,
    viewportX: number,
    viewportY: number,
    zoom: number
  ): void {
    const points = element.penPoints;
    if (!points || points.length < 2) return;

    ctx.save();
    ctx.globalAlpha = element.style.opacity * element.opacity;
    ctx.strokeStyle = element.style.strokeColor;
    ctx.lineWidth = element.style.strokeWidth * zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const first = points[0];
    ctx.moveTo(first.x * zoom + viewportX, first.y * zoom + viewportY);

    if (points.length === 2) {
      ctx.lineTo(points[1].x * zoom + viewportX, points[1].y * zoom + viewportY);
    } else {
      for (let i = 1; i < points.length - 1; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const cpx = p1.x * zoom + viewportX;
        const cpy = p1.y * zoom + viewportY;
        const endX = ((p1.x + p2.x) / 2) * zoom + viewportX;
        const endY = ((p1.y + p2.y) / 2) * zoom + viewportY;
        ctx.quadraticCurveTo(cpx, cpy, endX, endY);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last.x * zoom + viewportX, last.y * zoom + viewportY);
    }

    ctx.stroke();
    ctx.restore();

    if (selected) {
      const bb = getBoundingBox(points);
      this.drawSelectionBox(ctx, bb.x, bb.y, bb.width, bb.height, 0, viewportX, viewportY, zoom);
    }
  }

  hitTest(element: WhiteboardElement, point: Point): boolean {
    const points = element.penPoints;
    if (!points) return false;

    const threshold = Math.max(element.style.strokeWidth, 8);
    for (let i = 1; i < points.length; i++) {
      const dist = distanceToSegment(point, points[i - 1], points[i]);
      if (dist < threshold) return true;
    }
    return false;
  }

  getResizeHandles(element: WhiteboardElement): Point[] {
    return [];
  }
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return distance(p, {
    x: a.x + t * dx,
    y: a.y + t * dy,
  });
}
