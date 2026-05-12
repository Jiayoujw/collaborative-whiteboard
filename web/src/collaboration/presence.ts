import type { AwarenessState } from '../store/awareness';

const PRESENCE_TIMEOUT = 30000; // 30 seconds before a user is considered "away"

export function getActiveUsers(states: Map<string, AwarenessState>): AwarenessState[] {
  const now = Date.now();
  return Array.from(states.values()).filter(s => now - s.lastActive < PRESENCE_TIMEOUT);
}

export function getAwayUsers(states: Map<string, AwarenessState>): AwarenessState[] {
  const now = Date.now();
  return Array.from(states.values()).filter(s => now - s.lastActive >= PRESENCE_TIMEOUT);
}

export function getUserEditingElement(
  states: Map<string, AwarenessState>,
  elementId: string
): AwarenessState | null {
  for (const state of states.values()) {
    if (state.selectedElementIds.includes(elementId)) {
      return state;
    }
  }
  return null;
}

export function getViewportOverlap(
  viewportA: { x: number; y: number; width: number; height: number },
  viewportB: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    viewportA.x + viewportA.width < viewportB.x ||
    viewportB.x + viewportB.width < viewportA.x ||
    viewportA.y + viewportA.height < viewportB.y ||
    viewportB.y + viewportB.height < viewportA.y
  );
}
