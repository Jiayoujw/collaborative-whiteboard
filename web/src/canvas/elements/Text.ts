import type { WhiteboardElement, Point } from '@whiteboard/shared';
import { pointInRect } from '@whiteboard/shared';
import { BaseElementRenderer } from './BaseElement';

export class TextRenderer extends BaseElementRenderer {
  draw(
    ctx: CanvasRenderingContext2D,
    element: WhiteboardElement,
    selected: boolean,
    viewportX: number,
    viewportY: number,
    zoom: number
  ): void {
    const tc = element.textContent;
    if (!tc) return;

    this.applyTransform(ctx, element.x, element.y, element.width, element.height, element.rotation, viewportX, viewportY, zoom);
    this.applyStyle(ctx, element.style, element.opacity);

    const sx = element.x * zoom + viewportX;
    const sy = element.y * zoom + viewportY;
    const fontSize = tc.fontSize * zoom;

    ctx.font = `${tc.fontStyle} ${tc.fontWeight} ${fontSize}px ${tc.fontFamily}`;
    ctx.fillStyle = tc.color;
    ctx.textAlign = tc.textAlign;
    ctx.textBaseline = 'top';

    const lines = tc.text.split('\n');
    const lineHeight = fontSize * tc.lineHeight;
    const totalHeight = lines.length * lineHeight;
    const paddingX = 8 * zoom;
    const paddingY = 8 * zoom;

    let textX = sx + paddingX;
    if (tc.textAlign === 'center') textX = sx + element.width * zoom / 2;
    else if (tc.textAlign === 'right') textX = sx + element.width * zoom - paddingX;

    const textY = sy + (element.height * zoom - totalHeight) / 2;

    // Draw background
    ctx.fillStyle = element.style.fillColor;
    ctx.fillRect(sx, sy, element.width * zoom, element.height * zoom);
    if (element.style.strokeWidth > 0) {
      ctx.strokeStyle = element.style.strokeColor;
      ctx.lineWidth = element.style.strokeWidth * zoom;
      ctx.strokeRect(sx, sy, element.width * zoom, element.height * zoom);
    }

    // Draw text
    ctx.fillStyle = tc.color;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], textX, textY + i * lineHeight);
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
      { x, y }, { x: x + width / 2, y }, { x: x + width, y },
      { x: x + width, y: y + height / 2 }, { x: x + width, y: y + height },
      { x: x + width / 2, y: y + height }, { x, y: y + height }, { x, y: y + height / 2 },
    ];
  }
}
