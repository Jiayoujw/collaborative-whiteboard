import RBush from 'rbush';
import type { WhiteboardElement, Connection, Point, Rect } from '@whiteboard/shared';
import { rectsOverlap, distance } from '@whiteboard/shared';
import { hitTestElement } from '../elements';

interface SpatialItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  element: WhiteboardElement;
}

export class SpatialIndex {
  private tree = new RBush<SpatialItem>();
  private elementMap: Map<string, SpatialItem> = new Map();

  build(elements: WhiteboardElement[]): void {
    this.tree.clear();
    this.elementMap.clear();
    const items: SpatialItem[] = [];
    for (const el of elements) {
      if (!el.visible) continue;
      const item: SpatialItem = {
        minX: el.x,
        minY: el.y,
        maxX: el.x + el.width,
        maxY: el.y + el.height,
        element: el,
      };
      items.push(item);
      this.elementMap.set(el.id, item);
    }
    this.tree.load(items);
  }

  queryViewport(viewport: Rect, zoom: number): WhiteboardElement[] {
    const canvasViewport = {
      minX: (-viewport.x) / zoom,
      minY: (-viewport.y) / zoom,
      maxX: (-viewport.x + viewport.width) / zoom,
      maxY: (-viewport.y + viewport.height) / zoom,
    };
    const results = this.tree.search(canvasViewport);
    return results.map(r => r.element);
  }

  queryRect(rect: Rect): WhiteboardElement[] {
    return this.tree.search({
      minX: rect.x,
      minY: rect.y,
      maxX: rect.x + rect.width,
      maxY: rect.y + rect.height,
    }).map(r => r.element);
  }

  pointQuery(point: Point, elements: WhiteboardElement[]): WhiteboardElement | null {
    // Search top-most element first (reverse z-index order)
    const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
    for (const el of sorted) {
      if (!el.visible || el.locked) continue;
      if (hitTestElement(el, point)) {
        return el;
      }
    }
    return null;
  }

  connectionHitTest(point: Point, connections: Connection[], elements: WhiteboardElement[]): Connection | null {
    const threshold = 8;
    for (const conn of connections) {
      const source = elements.find(e => e.id === conn.sourceId);
      const target = elements.find(e => e.id === conn.targetId);
      if (!source || !target) continue;

      const start = getAnchorPoint(source, conn.sourceAnchor);
      const end = getAnchorPoint(target, conn.targetAnchor);

      const dist = distanceToSegment(point, start, end);
      if (dist < threshold) return conn;
    }
    return null;
  }
}

function getAnchorPoint(el: WhiteboardElement, anchor: string): Point {
  switch (anchor) {
    case 'top': return { x: el.x + el.width / 2, y: el.y };
    case 'right': return { x: el.x + el.width, y: el.y + el.height / 2 };
    case 'bottom': return { x: el.x + el.width / 2, y: el.y + el.height };
    case 'left': return { x: el.x, y: el.y + el.height / 2 };
    default: return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
  }
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}
