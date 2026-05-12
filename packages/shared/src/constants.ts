export const DEFAULT_ELEMENT_STYLE = {
  fillColor: '#ffffff',
  strokeColor: '#1a1a2e',
  strokeWidth: 1,
  opacity: 1,
  borderRadius: 8,
};

export const DEFAULT_TEXT_CONTENT = {
  text: 'Text',
  fontSize: 16,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'center' as const,
  lineHeight: 1.5,
  color: '#1a1a2e',
};

export const COLORS_PALETTE = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560',
  '#f05454', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
  '#9b59b6', '#1abc9c', '#e67e22', '#2ecc71', '#e74c3c',
];

export const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#AED6F1', '#D2B4DE',
];

export const CANVAS_BACKGROUND = '#f8f9fa';
export const GRID_COLOR = '#e5e7eb';
export const GRID_SIZE = 20;
export const GRID_SIZE_LARGE = 100;

export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 100;
export const DEFAULT_ZOOM = 1;

export const WS_PORT = 8080;
export const WS_PATH = '/ws';

export const SYNC_MESSAGE_TYPES = {
  SYNC: 0,
  AWARENESS: 1,
  HISTORY_REQUEST: 2,
  HISTORY_RESPONSE: 3,
  JOIN: 4,
  LEAVE: 5,
} as const;
