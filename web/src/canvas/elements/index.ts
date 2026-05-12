export { BaseElementRenderer } from './BaseElement';
export { RectangleRenderer } from './Rectangle';
export { EllipseRenderer } from './Ellipse';
export { TextRenderer } from './Text';
export { PenPathRenderer } from './PenPath';
export { FrameRenderer } from './Frame';

import type { WhiteboardElement, Point } from '@whiteboard/shared';
import type { BaseElementRenderer } from './BaseElement';
import { RectangleRenderer } from './Rectangle';
import { EllipseRenderer } from './Ellipse';
import { TextRenderer } from './Text';
import { PenPathRenderer } from './PenPath';
import { FrameRenderer } from './Frame';

const renderers: Record<string, BaseElementRenderer> = {
  rectangle: new RectangleRenderer(),
  ellipse: new EllipseRenderer(),
  text: new TextRenderer(),
  'pen-path': new PenPathRenderer(),
  frame: new FrameRenderer(),
};

export function getElementRenderer(type: string): BaseElementRenderer | undefined {
  return renderers[type] || renderers.rectangle;
}

export function hitTestElement(element: WhiteboardElement, point: Point): boolean {
  const renderer = getElementRenderer(element.type);
  return renderer?.hitTest(element, point) ?? false;
}
