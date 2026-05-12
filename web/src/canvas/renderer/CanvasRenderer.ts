import type { WhiteboardElement, Connection, Point, Rect, ViewportState } from '@whiteboard/shared';
import { CANVAS_BACKGROUND, GRID_COLOR, GRID_SIZE, GRID_SIZE_LARGE } from '@whiteboard/shared';
import { getElementRenderer } from '../elements';
import { SpatialIndex } from '../hit-test';
import { EffectsRenderer } from '../effects';
import type { AwarenessState } from '../../store/awareness';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D;
  private spatialIndex = new SpatialIndex();
  private effects = new EffectsRenderer();
  private viewport: ViewportState = { x: 0, y: 0, zoom: 1 };
  private animFrameId: number | null = null;
  private dirty = true;

  // Pixel ratio for sharp rendering
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement, overlayCanvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.overlayCanvas = overlayCanvas;
    this.overlayCtx = overlayCanvas.getContext('2d')!;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private resize = (): void => {
    const { width, height } = this.canvas.parentElement!.getBoundingClientRect();
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.overlayCanvas.width = width * this.dpr;
    this.overlayCanvas.height = height * this.dpr;
    this.overlayCanvas.style.width = `${width}px`;
    this.overlayCanvas.style.height = `${height}px`;
    this.overlayCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.dirty = true;
  };

  setViewport(vp: ViewportState): void {
    this.viewport = vp;
    this.dirty = true;
  }

  getViewport(): ViewportState {
    return { ...this.viewport };
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getOverlayCanvas(): HTMLCanvasElement {
    return this.overlayCanvas;
  }

  markDirty(): void {
    this.dirty = true;
  }

  render(
    elements: WhiteboardElement[],
    connections: Connection[],
    selectedIds: string[],
    remoteUsers: AwarenessState[],
    localUserId: string,
    editingTextId: string | null,
  ): void {
    if (!this.dirty) return;
    this.dirty = false;

    const { x: vx, y: vy, zoom } = this.viewport;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    // Clear
    this.ctx.clearRect(0, 0, w, h);
    this.overlayCtx.clearRect(0, 0, w, h);

    // Background
    this.ctx.fillStyle = CANVAS_BACKGROUND;
    this.ctx.fillRect(0, 0, w, h);

    // Grid
    this.drawGrid(this.ctx, vx, vy, zoom, w, h);

    // Update spatial index
    this.spatialIndex.build(elements);

    // Sort elements by z-index
    const sorted = [...elements]
      .filter(el => el.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    // Draw elements
    for (const el of sorted) {
      if (el.id === editingTextId) continue; // Skip if being edited in DOM
      const renderer = getElementRenderer(el.type);
      if (renderer) {
        renderer.draw(this.ctx, el, selectedIds.includes(el.id), vx, vy, zoom);
      }
    }

    // Draw connections
    this.drawConnections(this.ctx, connections, elements, selectedIds, vx, vy, zoom);

    // Draw alignment guides
    if (selectedIds.length === 1) {
      this.drawAlignmentGuides(this.ctx, elements, elements.find(e => e.id === selectedIds[0])!, vx, vy, zoom, w, h);
    }

    // Draw remote cursors
    this.drawRemoteCursors(this.overlayCtx, remoteUsers, localUserId, vx, vy, zoom);

    // Draw effects
    this.effects.update();
    if (this.effects.hasParticles) {
      this.effects.draw(this.overlayCtx, vx, vy, zoom);
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D, vx: number, vy: number, zoom: number, w: number, h: number): void {
    if (zoom < 0.1) return;

    const gridSize = zoom < 0.5 ? GRID_SIZE_LARGE : GRID_SIZE;
    const gs = gridSize * zoom;

    const startX = ((vx % gs) + gs) % gs;
    const startY = ((vy % gs) + gs) % gs;

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = gridSize === GRID_SIZE_LARGE ? 1 : 0.5;

    ctx.beginPath();
    for (let x = startX; x < w; x += gs) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = startY; y < h; y += gs) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }

  private drawConnections(
    ctx: CanvasRenderingContext2D,
    connections: Connection[],
    elements: WhiteboardElement[],
    selectedIds: string[],
    vx: number,
    vy: number,
    zoom: number
  ): void {
    const elementMap = new Map(elements.map(e => [e.id, e]));

    for (const conn of connections) {
      const source = elementMap.get(conn.sourceId);
      const target = elementMap.get(conn.targetId);
      if (!source || !target) continue;

      const start = this.getAnchor(source, conn.sourceAnchor);
      const end = this.getAnchor(target, conn.targetAnchor);

      const sx = start.x * zoom + vx;
      const sy = start.y * zoom + vy;
      const ex = end.x * zoom + vx;
      const ey = end.y * zoom + vy;

      ctx.save();
      ctx.strokeStyle = conn.style.strokeColor;
      ctx.lineWidth = conn.style.strokeWidth * zoom;

      if (conn.style.strokeStyle === 'dashed') ctx.setLineDash([8 * zoom, 4 * zoom]);
      else if (conn.style.strokeStyle === 'dotted') ctx.setLineDash([2 * zoom, 2 * zoom]);

      ctx.beginPath();
      ctx.moveTo(sx, sy);

      const curvature = conn.style.curvature * zoom;
      if (curvature > 0) {
        const midX = (sx + ex) / 2;
        const midY = (sy + ey) / 2;
        const dx = ex - sx;
        const dy = ey - sy;
        const cpX = midX - dy * curvature * 0.5;
        const cpY = midY + dx * curvature * 0.5;
        ctx.quadraticCurveTo(cpX, cpY, ex, ey);
      } else {
        ctx.lineTo(ex, ey);
      }

      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow end
      if (conn.style.endArrow && conn.style.endArrow !== 'none') {
        this.drawArrow(ctx, ex, ey, sx, sy, conn.style.endArrow, zoom);
      }

      // Arrow start
      if (conn.style.startArrow && conn.style.startArrow !== 'none') {
        this.drawArrow(ctx, sx, sy, ex, ey, conn.style.startArrow, zoom);
      }

      ctx.restore();
    }
  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    fromX: number,
    fromY: number,
    type: string,
    zoom: number
  ): void {
    const angle = Math.atan2(y - fromY, x - fromX);
    const size = 10 * zoom;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = ctx.strokeStyle;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.4);
    ctx.lineTo(-size, size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private getAnchor(el: WhiteboardElement, anchor: string): Point {
    switch (anchor) {
      case 'top': return { x: el.x + el.width / 2, y: el.y };
      case 'right': return { x: el.x + el.width, y: el.y + el.height / 2 };
      case 'bottom': return { x: el.x + el.width / 2, y: el.y + el.height };
      case 'left': return { x: el.x, y: el.y + el.height / 2 };
      default: // auto - find nearest side
        return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
    }
  }

  private drawAlignmentGuides(
    ctx: CanvasRenderingContext2D,
    elements: WhiteboardElement[],
    selected: WhiteboardElement,
    vx: number,
    vy: number,
    zoom: number,
    w: number,
    h: number
  ): void {
    const otherElements = elements.filter(e => e.id !== selected.id && e.visible);
    const threshold = 5;

    const sCenterX = selected.x + selected.width / 2;
    const sCenterY = selected.y + selected.height / 2;
    const sRight = selected.x + selected.width;
    const sBottom = selected.y + selected.height;

    ctx.save();
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (const other of otherElements) {
      const oCenterX = other.x + other.width / 2;
      const oCenterY = other.y + other.height / 2;
      const oRight = other.x + other.width;
      const oBottom = other.y + other.height;

      // Center X alignment
      if (Math.abs(sCenterX - oCenterX) < threshold) {
        const x = oCenterX * zoom + vx;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      // Center Y alignment
      if (Math.abs(sCenterY - oCenterY) < threshold) {
        const y = oCenterY * zoom + vy;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawRemoteCursors(
    ctx: CanvasRenderingContext2D,
    remoteUsers: AwarenessState[],
    localUserId: string,
    vx: number,
    vy: number,
    zoom: number
  ): void {
    for (const user of remoteUsers) {
      if (user.userId === localUserId) continue;

      const cx = user.cursor.x * zoom + vx;
      const cy = user.cursor.y * zoom + vy;

      // Cursor
      ctx.save();
      ctx.fillStyle = user.color;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 12, cy + 14);
      ctx.lineTo(cx + 4, cy + 13);
      ctx.lineTo(cx + 6, cy + 20);
      ctx.lineTo(cx, cy + 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Name label
      ctx.font = '11px Inter, system-ui, sans-serif';
      const textW = ctx.measureText(user.userName).width;
      ctx.fillStyle = user.color;
      ctx.fillRect(cx + 14, cy + 14, textW + 8, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(user.userName, cx + 18, cy + 27);
      ctx.restore();
    }
  }

  screenToCanvas(screenX: number, screenY: number): Point {
    return {
      x: (screenX - this.viewport.x) / this.viewport.zoom,
      y: (screenY - this.viewport.y) / this.viewport.zoom,
    };
  }

  getSpatialIndex(): SpatialIndex {
    return this.spatialIndex;
  }

  spawnCreationEffect(x: number, y: number): void {
    this.effects.spawnElementCreatedEffect(x, y);
    this.markDirty();
  }

  destroy(): void {
    window.removeEventListener('resize', this.resize);
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }
}
