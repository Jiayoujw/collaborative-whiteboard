import * as Y from 'yjs';
import type { WhiteboardElement, Connection, Comment, UserPresence, WhiteboardDocument } from '@whiteboard/shared';

export class DocumentSchema {
  doc: Y.Doc;
  elements: Y.Map<WhiteboardElement>;
  connections: Y.Map<Connection>;
  comments: Y.Map<Comment>;
  awareness: Y.Map<any>;

  constructor(doc: Y.Doc) {
    this.doc = doc;
    this.elements = doc.getMap('elements');
    this.connections = doc.getMap('connections');
    this.comments = doc.getMap('comments');
    this.awareness = doc.getMap('awareness');
  }

  addElement(element: WhiteboardElement): void {
    this.elements.set(element.id, element as any);
  }

  updateElement(id: string, updates: Partial<WhiteboardElement>): void {
    const existing = this.elements.get(id);
    if (existing) {
      this.elements.set(id, { ...existing, ...updates } as any);
    }
  }

  deleteElement(id: string): void {
    this.elements.delete(id);
    // Also delete connections referencing this element
    this.connections.forEach((conn) => {
      if (conn.sourceId === id || conn.targetId === id) {
        this.connections.delete(conn.id);
      }
    });
  }

  addConnection(connection: Connection): void {
    this.connections.set(connection.id, connection as any);
  }

  deleteConnection(id: string): void {
    this.connections.delete(id);
  }

  addComment(comment: Comment): void {
    this.comments.set(comment.id, comment as any);
  }

  resolveComment(id: string): void {
    const existing = this.comments.get(id);
    if (existing) {
      this.comments.set(id, { ...existing, resolved: true } as any);
    }
  }

  getAllElements(): WhiteboardElement[] {
    return Array.from(this.elements.values());
  }

  getAllConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  getAllComments(): Comment[] {
    return Array.from(this.comments.values());
  }

  getElement(id: string): WhiteboardElement | undefined {
    return this.elements.get(id);
  }

  getConnection(id: string): Connection | undefined {
    return this.connections.get(id);
  }

  toJSON(): WhiteboardDocument {
    return {
      id: 'doc',
      name: 'Untitled',
      elements: Object.fromEntries(this.elements.entries()),
      connections: Object.fromEntries(this.connections.entries()),
      comments: Object.fromEntries(this.comments.entries()),
      historySnapshots: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}
