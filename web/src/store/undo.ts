import * as Y from 'yjs';

export class UndoManager {
  private undoManager: Y.UndoManager;
  private trackedOperations: Set<string>;

  constructor(doc: Y.Doc, trackedOrigins: string[] = []) {
    const trackedTypes: Y.AbstractType<any>[] = [
      doc.getMap('elements'),
      doc.getMap('connections'),
      doc.getMap('comments'),
    ];

    this.undoManager = new Y.UndoManager(trackedTypes, {
      captureTimeout: 500,
      trackedOrigins: new Set(['user-action']),
    });

    this.trackedOperations = new Set(trackedOrigins);
  }

  undo(): void {
    this.undoManager.undo();
  }

  redo(): void {
    this.undoManager.redo();
  }

  canUndo(): boolean {
    return this.undoManager.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.undoManager.redoStack.length > 0;
  }

  getStackSize(): { undo: number; redo: number } {
    return {
      undo: this.undoManager.undoStack.length,
      redo: this.undoManager.redoStack.length,
    };
  }

  clear(): void {
    this.undoManager.clear();
  }
}
