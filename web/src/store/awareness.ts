import type { Point, Rect } from '@whiteboard/shared';
import { USER_COLORS } from '@whiteboard/shared';

export interface AwarenessState {
  userId: string;
  userName: string;
  color: string;
  cursor: Point;
  viewport: Rect;
  selectedElementIds: string[];
  lastActive: number;
}

export class AwarenessManager {
  private states: Map<string, AwarenessState> = new Map();
  private localUserId: string;
  private onChangeCallbacks: Array<(states: Map<string, AwarenessState>) => void> = [];
  private colorIndex = 0;

  constructor(localUserId: string) {
    this.localUserId = localUserId;
    this.states.set(localUserId, {
      userId: localUserId,
      userName: 'You',
      color: USER_COLORS[0],
      cursor: { x: 0, y: 0 },
      viewport: { x: 0, y: 0, width: 0, height: 0 },
      selectedElementIds: [],
      lastActive: Date.now(),
    });
  }

  get localState(): AwarenessState {
    return this.states.get(this.localUserId)!;
  }

  updateLocalCursor(cursor: Point): void {
    const state = this.states.get(this.localUserId)!;
    state.cursor = cursor;
    state.lastActive = Date.now();
    this.states.set(this.localUserId, state);
    this.notify();
  }

  updateLocalViewport(viewport: Rect): void {
    const state = this.states.get(this.localUserId)!;
    state.viewport = viewport;
    state.lastActive = Date.now();
    this.states.set(this.localUserId, state);
    this.notify();
  }

  updateLocalSelection(elementIds: string[]): void {
    const state = this.states.get(this.localUserId)!;
    state.selectedElementIds = elementIds;
    state.lastActive = Date.now();
    this.states.set(this.localUserId, state);
    this.notify();
  }

  addRemoteUser(userId: string, userName: string): void {
    if (this.states.has(userId)) return;
    this.colorIndex = (this.colorIndex + 1) % USER_COLORS.length;
    this.states.set(userId, {
      userId,
      userName,
      color: USER_COLORS[this.colorIndex + 1],
      cursor: { x: 0, y: 0 },
      viewport: { x: 0, y: 0, width: 0, height: 0 },
      selectedElementIds: [],
      lastActive: Date.now(),
    });
    this.notify();
  }

  removeRemoteUser(userId: string): void {
    this.states.delete(userId);
    this.notify();
  }

  updateRemoteState(userId: string, updates: Partial<AwarenessState>): void {
    const state = this.states.get(userId);
    if (state) {
      Object.assign(state, updates, { lastActive: Date.now() });
      this.states.set(userId, state);
      this.notify();
    }
  }

  getAllStates(): Map<string, AwarenessState> {
    return new Map(this.states);
  }

  getRemoteStates(): AwarenessState[] {
    return Array.from(this.states.entries())
      .filter(([id]) => id !== this.localUserId)
      .map(([, state]) => state);
  }

  onChange(callback: (states: Map<string, AwarenessState>) => void): () => void {
    this.onChangeCallbacks.push(callback);
    return () => {
      this.onChangeCallbacks = this.onChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  private notify(): void {
    for (const cb of this.onChangeCallbacks) {
      cb(this.getAllStates());
    }
  }
}
