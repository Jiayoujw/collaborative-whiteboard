import type { WhiteboardElement, AutoLayoutProps } from '@whiteboard/shared';
import { nanoid } from 'nanoid';

interface AILayoutResult {
  elements: WhiteboardElement[];
  suggestions: string[];
}

interface AIMindMapNode {
  text: string;
  children: AIMindMapNode[];
}

/**
 * AI-powered layout optimization
 * Uses rule-based heuristics to suggest better layouts
 */
export function aiOptimizeLayout(elements: WhiteboardElement[]): AILayoutResult {
  const suggestions: string[] = [];
  const updated = elements.map(e => ({ ...e }));

  // Detect overlapping elements
  for (let i = 0; i < updated.length; i++) {
    for (let j = i + 1; j < updated.length; j++) {
      if (rectsOverlap(updated[i], updated[j])) {
        updated[j].x = updated[i].x + updated[i].width + 40;
        suggestions.push(`Fixed overlap between "${getElementLabel(updated[i])}" and "${getElementLabel(updated[j])}"`);
      }
    }
  }

  // Align similar-sized elements
  const groups = groupBySize(updated);
  for (const group of groups) {
    if (group.length >= 3) {
      // Arrange in grid
      const cols = Math.ceil(Math.sqrt(group.length));
      const baseX = group[0].x;
      const baseY = group[0].y;
      for (let i = 0; i < group.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        group[i].x = baseX + col * (group[i].width + 24);
        group[i].y = baseY + row * (group[i].height + 24);
      }
      suggestions.push(`Arranged ${group.length} similar elements in a grid`);
    }
  }

  return { elements: updated, suggestions };
}

/**
 * Generate mind map from text description
 */
export function aiGenerateMindMap(
  rootText: string,
  topics: string[],
  centerX: number,
  centerY: number
): { elements: WhiteboardElement[]; connections: any[] } {
  const elements: WhiteboardElement[] = [];
  const connections: any[] = [];

  const rootId = nanoid();
  elements.push(createTextElement(rootId, rootText, centerX - 80, centerY - 20, 160, 40, '#4d96ff', '#fff'));

  const radius = 200;
  const angleStep = (Math.PI * 2) / topics.length;

  for (let i = 0; i < topics.length; i++) {
    const angle = angleStep * i - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius - 60;
    const y = centerY + Math.sin(angle) * radius - 18;

    const topicId = nanoid();
    elements.push(createTextElement(topicId, topics[i], x, y, 120, 36, '#50c878', '#333'));

    connections.push({
      id: nanoid(),
      sourceId: rootId,
      targetId: topicId,
      sourceAnchor: 'auto',
      targetAnchor: 'auto',
      style: {
        strokeColor: '#6c757d',
        strokeWidth: 2,
        strokeStyle: 'solid',
        endArrow: 'arrow',
        curvature: 0.2,
      },
      zIndex: 0,
    });
  }

  return { elements, connections };
}

/**
 * Generate diagram from natural language (simplified)
 */
export function aiGenerateDiagram(
  description: string,
  startX: number,
  startY: number
): { elements: WhiteboardElement[]; connections: any[] } {
  const keywords = description.toLowerCase();
  const elements: WhiteboardElement[] = [];
  const connections: any[] = [];

  if (keywords.includes('flowchart') || keywords.includes('flow')) {
    // Generate a simple flowchart
    const steps = ['Start', 'Process', 'Decision', 'End'];
    const boxWidth = 140;
    const boxHeight = 50;
    const gap = 120;

    for (let i = 0; i < steps.length; i++) {
      const id = nanoid();
      const isDecision = steps[i] === 'Decision';

      elements.push({
        id,
        type: isDecision ? 'rectangle' : 'rectangle',
        x: startX + (isDecision ? 20 : 0),
        y: startY + i * (boxHeight + gap),
        width: isDecision ? boxWidth - 40 : boxWidth,
        height: isDecision ? boxHeight + 10 : boxHeight,
        rotation: isDecision ? 45 : 0,
        zIndex: i,
        style: {
          fillColor: i === 0 ? '#e8f5e9' : i === steps.length - 1 ? '#fce4ec' : '#e3f2fd',
          strokeColor: '#333',
          strokeWidth: 2,
          opacity: 1,
          borderRadius: 8,
        },
        opacity: 1,
        locked: false,
        visible: true,
        textContent: {
          text: steps[i],
          fontSize: 14,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: '600',
          fontStyle: 'normal',
          textAlign: 'center',
          lineHeight: 1.4,
          color: '#333',
        },
      });

      if (i > 0) {
        connections.push({
          id: nanoid(),
          sourceId: elements[i - 1].id,
          targetId: id,
          sourceAnchor: 'bottom',
          targetAnchor: 'top',
          style: {
            strokeColor: '#666',
            strokeWidth: 2,
            strokeStyle: 'solid',
            endArrow: 'arrow',
            curvature: 0,
          },
          zIndex: 0,
        });
      }
    }
  } else if (keywords.includes('mindmap') || keywords.includes('mind')) {
    return aiGenerateMindMap('Main Topic', ['Subtopic A', 'Subtopic B', 'Subtopic C', 'Subtopic D'], startX, startY);
  } else {
    // Generic diagram - create some boxes
    const count = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const id = nanoid();
      const x = startX + (i % 3) * 200;
      const y = startY + Math.floor(i / 3) * 120;

      elements.push({
        id,
        type: 'rectangle',
        x,
        y,
        width: 160,
        height: 80,
        rotation: 0,
        zIndex: i,
        style: {
          fillColor: COLORS[i % COLORS.length],
          strokeColor: '#333',
          strokeWidth: 1,
          opacity: 1,
          borderRadius: 12,
        },
        opacity: 1,
        locked: false,
        visible: true,
        textContent: {
          text: `Node ${i + 1}`,
          fontSize: 14,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: '500',
          fontStyle: 'normal',
          textAlign: 'center',
          lineHeight: 1.4,
          color: '#fff',
        },
      });
    }
  }

  return { elements, connections };
}

const COLORS = ['#4d96ff', '#50c878', '#ff6b6b', '#ffd93d', '#9b59b6', '#1abc9c', '#e67e22'];

function rectsOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
}

function getElementLabel(el: WhiteboardElement): string {
  return el.textContent?.text || el.type;
}

function groupBySize(elements: WhiteboardElement[]): WhiteboardElement[][] {
  const groups: WhiteboardElement[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < elements.length; i++) {
    if (used.has(i)) continue;
    const group: WhiteboardElement[] = [elements[i]];
    used.add(i);

    for (let j = i + 1; j < elements.length; j++) {
      if (used.has(j)) continue;
      if (
        Math.abs(elements[i].width - elements[j].width) < 10 &&
        Math.abs(elements[i].height - elements[j].height) < 10
      ) {
        group.push(elements[j]);
        used.add(j);
      }
    }
    groups.push(group);
  }
  return groups;
}

function createTextElement(
  id: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string,
  textColor: string
): WhiteboardElement {
  return {
    id,
    type: 'rectangle',
    x,
    y,
    width,
    height,
    rotation: 0,
    zIndex: 0,
    style: {
      fillColor,
      strokeColor: '#333',
      strokeWidth: 1,
      opacity: 1,
      borderRadius: 8,
      shadow: { color: 'rgba(0,0,0,0.1)', offsetX: 0, offsetY: 2, blur: 8 },
    },
    opacity: 1,
    locked: false,
    visible: true,
    textContent: {
      text,
      fontSize: 14,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: '600',
      fontStyle: 'normal',
      textAlign: 'center',
      lineHeight: 1.4,
      color: textColor,
    },
  };
}
