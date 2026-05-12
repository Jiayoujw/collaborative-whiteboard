import type { WhiteboardElement, AutoLayoutProps, AlignType } from '@whiteboard/shared';

export function applyAutoLayout(
  container: WhiteboardElement,
  children: WhiteboardElement[],
  layout: AutoLayoutProps
): WhiteboardElement[] {
  if (!layout.enabled || children.length === 0) return children;

  const { direction, gap, padding, align, wrap } = layout;
  const contentX = container.x + padding.left;
  const contentY = container.y + padding.top;
  const maxWidth = container.width - padding.left - padding.right;
  const maxHeight = container.height - padding.top - padding.bottom;

  let currentX = contentX;
  let currentY = contentY;
  let rowHeight = 0;
  const updated = [...children];

  for (let i = 0; i < updated.length; i++) {
    const child = updated[i];

    if (direction === 'horizontal') {
      if (wrap && currentX + child.width > contentX + maxWidth && currentX > contentX) {
        currentX = contentX;
        currentY += rowHeight + gap;
        rowHeight = 0;
      }

      child.x = currentX;
      child.y = currentY + getAlignOffset(child.height, rowHeight || child.height, align);

      currentX += child.width + gap;
      rowHeight = Math.max(rowHeight, child.height);
    } else {
      if (wrap && currentY + child.height > contentY + maxHeight && currentY > contentY) {
        currentY = contentY;
        currentX += rowHeight + gap;
        rowHeight = 0;
      }

      child.x = currentX + getAlignOffset(child.width, rowHeight || child.width, align);
      child.y = currentY;

      currentY += child.height + gap;
      rowHeight = Math.max(rowHeight, child.width);
    }
  }

  return updated;
}

function getAlignOffset(childSize: number, lineSize: number, align: AlignType): number {
  switch (align) {
    case 'center':
    case 'middle':
      return (lineSize - childSize) / 2;
    case 'right':
    case 'bottom':
      return lineSize - childSize;
    default:
      return 0;
  }
}

export function suggestAutoLayout(
  elements: WhiteboardElement[]
): AutoLayoutProps | null {
  if (elements.length < 2) return null;

  // Detect if elements are roughly in a row or column
  const avgX = elements.reduce((s, e) => s + e.x, 0) / elements.length;
  const avgY = elements.reduce((s, e) => s + e.y, 0) / elements.length;

  const xVariance = elements.reduce((s, e) => s + (e.x - avgX) ** 2, 0) / elements.length;
  const yVariance = elements.reduce((s, e) => s + (e.y - avgY) ** 2, 0) / elements.length;

  const direction = xVariance > yVariance ? 'horizontal' : 'vertical';
  const gap = elements.reduce((s, e, i) => {
    if (i === 0) return s;
    const prev = elements[i - 1];
    return s + (direction === 'horizontal' ? e.x - (prev.x + prev.width) : e.y - (prev.y + prev.height));
  }, 0) / (elements.length - 1);

  return {
    enabled: false,
    direction,
    gap: Math.round(Math.max(8, gap)),
    padding: { top: 16, right: 16, bottom: 16, left: 16 },
    align: 'left',
    wrap: false,
  };
}
