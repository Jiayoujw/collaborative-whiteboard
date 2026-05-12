import type { WhiteboardElement, Connection } from '@whiteboard/shared';

interface MindMapNode {
  id: string;
  element: WhiteboardElement;
  children: MindMapNode[];
  parent?: MindMapNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 60;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 20;

export function layoutMindMap(
  rootElement: WhiteboardElement,
  elements: WhiteboardElement[],
  connections: Connection[]
): { elements: WhiteboardElement[]; connections: Connection[] } {
  // Build tree structure
  const nodeMap = new Map<string, MindMapNode>();
  const rootNode: MindMapNode = {
    id: rootElement.id,
    element: { ...rootElement, width: NODE_WIDTH, height: NODE_HEIGHT },
    children: [],
    x: 0,
    y: 0,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
  };
  nodeMap.set(rootElement.id, rootNode);

  // Build adjacency
  const childrenMap = new Map<string, string[]>();
  for (const conn of connections) {
    if (!childrenMap.has(conn.sourceId)) {
      childrenMap.set(conn.sourceId, []);
    }
    childrenMap.get(conn.sourceId)!.push(conn.targetId);
  }

  // BFS to build tree
  const queue = [rootElement.id];
  const visited = new Set<string>();
  visited.add(rootElement.id);

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const childIds = childrenMap.get(parentId) || [];

    for (const childId of childIds) {
      if (visited.has(childId)) continue;
      visited.add(childId);

      const childEl = elements.find(e => e.id === childId);
      if (!childEl) continue;

      const childNode: MindMapNode = {
        id: childId,
        element: { ...childEl, width: NODE_WIDTH, height: NODE_HEIGHT },
        children: [],
        parent: nodeMap.get(parentId),
        x: 0,
        y: 0,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      };
      nodeMap.get(parentId)!.children.push(childNode);
      nodeMap.set(childId, childNode);
      queue.push(childId);
    }
  }

  // Layout using Reingold-Tilford algorithm
  layoutTree(rootNode, HORIZONTAL_GAP, VERTICAL_GAP);

  // Calculate bounding box and offset
  let minX = Infinity, minY = Infinity;
  const updatedElements: WhiteboardElement[] = [];
  const elementUpdates: Map<string, { x: number; y: number; width: number; height: number }> = new Map();

  for (const [id, node] of nodeMap) {
    elementUpdates.set(id, {
      x: node.x,
      y: node.y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
  }

  // Offset to root position
  const offsetX = rootElement.x - rootNode.x;
  const offsetY = rootElement.y - rootNode.y;

  for (const [id, update] of elementUpdates) {
    const original = elements.find(e => e.id === id);
    if (original) {
      updatedElements.push({
        ...original,
        x: update.x + offsetX,
        y: update.y + offsetY,
        width: update.width,
        height: update.height,
      });
    }
  }

  return { elements: updatedElements, connections };
}

function layoutTree(node: MindMapNode, hGap: number, vGap: number): void {
  if (node.children.length === 0) return;

  // Layout children recursively
  for (const child of node.children) {
    layoutTree(child, hGap, vGap);
  }

  // Position children
  let totalHeight = 0;
  for (const child of node.children) {
    totalHeight += child.height + vGap;
  }
  totalHeight -= vGap;

  let currentY = node.y - totalHeight / 2 + NODE_HEIGHT / 2;

  for (const child of node.children) {
    child.x = node.x + NODE_WIDTH + hGap;
    child.y = currentY;
    currentY += child.height + vGap;
  }
}

export function buildMindMapConnections(
  rootElement: WhiteboardElement,
  elements: WhiteboardElement[],
  connections: Connection[]
): Connection[] {
  const nodeMap = new Map(elements.map(e => [e.id, e]));
  const updatedConnections: Connection[] = [];

  // Create connections based on tree structure
  const childrenMap = new Map<string, string[]>();
  for (const conn of connections) {
    if (!childrenMap.has(conn.sourceId)) {
      childrenMap.set(conn.sourceId, []);
    }
    childrenMap.get(conn.sourceId)!.push(conn.targetId);
  }

  const visited = new Set<string>();
  const queue = [rootElement.id];
  visited.add(rootElement.id);

  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const childIds = childrenMap.get(parentId) || [];

    for (const childId of childIds) {
      if (visited.has(childId)) continue;
      visited.add(childId);

      const existingConn = connections.find(c => c.sourceId === parentId && c.targetId === childId);
      updatedConnections.push({
        id: existingConn?.id || `conn_${parentId}_${childId}`,
        sourceId: parentId,
        targetId: childId,
        sourceAnchor: 'right',
        targetAnchor: 'left',
        style: {
          strokeColor: '#6c757d',
          strokeWidth: 2,
          strokeStyle: 'solid',
          endArrow: 'arrow',
          curvature: 0.3,
        },
        zIndex: 0,
      });

      queue.push(childId);
    }
  }

  return updatedConnections;
}
