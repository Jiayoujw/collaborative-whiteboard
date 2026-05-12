export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ElementType =
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'image'
  | 'pen-path'
  | 'frame'
  | 'group';

export type AlignType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type ConstraintType = 'min' | 'max' | 'center' | 'stretch' | 'scale';

export interface ElementStyle {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  borderRadius: number;
  shadow?: {
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
  };
}

export interface TextContent {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  color: string;
}

export interface AutoLayoutProps {
  enabled: boolean;
  direction: 'horizontal' | 'vertical';
  gap: number;
  padding: { top: number; right: number; bottom: number; left: number };
  align: AlignType;
  wrap: boolean;
}

export interface WhiteboardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  style: ElementStyle;
  textContent?: TextContent;
  imageUrl?: string;
  penPoints?: Point[];
  autoLayout?: AutoLayoutProps;
  constraints?: { horizontal: ConstraintType; vertical: ConstraintType };
  opacity: number;
  locked: boolean;
  visible: boolean;
  parentId?: string;
  childIds?: string[];
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceAnchor: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  targetAnchor: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  path?: Point[];
  style: {
    strokeColor: string;
    strokeWidth: number;
    strokeStyle: 'solid' | 'dashed' | 'dotted';
    startArrow?: 'none' | 'arrow' | 'circle' | 'diamond';
    endArrow?: 'none' | 'arrow' | 'circle' | 'diamond';
    curvature: number;
  };
  label?: string;
  zIndex: number;
}

export interface Comment {
  id: string;
  elementId?: string;
  x: number;
  y: number;
  author: string;
  text: string;
  createdAt: number;
  resolved: boolean;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  author: string;
  text: string;
  createdAt: number;
}

export interface UserPresence {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  cursor: Point;
  viewport: Rect;
  selectedElementIds: string[];
  lastActive: number;
}

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  label: string;
}

export type ToolType =
  | 'select'
  | 'hand'
  | 'rectangle'
  | 'ellipse'
  | 'text'
  | 'pen'
  | 'line'
  | 'frame'
  | 'comment';

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface WhiteboardDocument {
  id: string;
  name: string;
  elements: Record<string, WhiteboardElement>;
  connections: Record<string, Connection>;
  comments: Record<string, Comment>;
  historySnapshots: HistorySnapshot[];
  createdAt: number;
  updatedAt: number;
}
