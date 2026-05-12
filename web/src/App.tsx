import React, { useCallback, useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import type { WhiteboardElement, Connection, Comment, ToolType, Point, ViewportState } from '@whiteboard/shared';
import { DEFAULT_ELEMENT_STYLE, DEFAULT_TEXT_CONTENT, screenToCanvas } from '@whiteboard/shared';
import { useWhiteboardStore, useStoreSnapshot, useRemoteUsers } from './store/hooks';
import { CanvasRenderer } from './canvas/renderer/CanvasRenderer';
import { Toolbar } from './ui/Toolbar';
import { LayersPanel } from './ui/LayersPanel';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { CommentsPanel } from './ui/CommentsPanel';
import { Minimap } from './ui/Minimap';
import { VersionHistory } from './ui/VersionHistory';
import { layoutMindMap, buildMindMapConnections } from './layout/mindmap';
import { applyAutoLayout, suggestAutoLayout } from './layout/flexbox';
import { aiGenerateDiagram, aiOptimizeLayout, aiGenerateMindMap } from './ai';

type PanelType = 'layers' | 'properties' | 'comments' | 'version' | 'none';

export default function App() {
  const store = useWhiteboardStore();
  const { elements, connections, comments } = useStoreSnapshot();
  const remoteUsers = useRemoteUsers();

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, zoom: 1 });
  const [activePanel, setActivePanel] = useState<PanelType>('layers');
  const [connected, setConnected] = useState(false);
  const [penPoints, setPenPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragState, setDragState] = useState<{
    type: 'none' | 'pan' | 'resize' | 'draw' | 'select';
    startX: number;
    startY: number;
    elementId?: string;
    handleIndex?: number;
  }>({ type: 'none', startX: 0, startY: 0 });
  const [lineStart, setLineStart] = useState<{ elementId: string; anchor: string } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const animFrameRef = useRef<number>(0);

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current || !overlayRef.current) return;
    const renderer = new CanvasRenderer(canvasRef.current, overlayRef.current);
    rendererRef.current = renderer;

    return () => renderer.destroy();
  }, []);

  // Connection status
  useEffect(() => {
    const timer = setInterval(() => {
      setConnected(store.collabClient?.wsClient?.connected ?? false);
    }, 1000);
    return () => clearInterval(timer);
  }, [store]);

  // Render loop
  const render = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setViewport(viewport);
    renderer.render(
      elements,
      connections,
      selectedIds,
      remoteUsers,
      store.awareness.localState.userId,
      editingTextId,
    );
    animFrameRef.current = requestAnimationFrame(render);
  }, [elements, connections, selectedIds, remoteUsers, viewport, store.awareness.localState.userId, editingTextId]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  // Update local cursor in awareness
  useEffect(() => {
    store.awareness.updateLocalViewport({
      x: -viewport.x / viewport.zoom,
      y: -viewport.y / viewport.zoom,
      width: (containerRef.current?.clientWidth || 0) / viewport.zoom,
      height: (containerRef.current?.clientHeight || 0) / viewport.zoom,
    });
  }, [viewport, store]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Tool shortcuts
      const toolKeys: Record<string, ToolType> = {
        'v': 'select', 'h': 'hand', 'r': 'rectangle', 'o': 'ellipse',
        't': 'text', 'p': 'pen', 'l': 'line', 'f': 'frame', 'c': 'comment',
      };

      if (!e.ctrlKey && !e.metaKey && toolKeys[e.key]) {
        setActiveTool(toolKeys[e.key]);
        return;
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.undoManager.undo();
        rendererRef.current?.markDirty();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        store.undoManager.redo();
        rendererRef.current?.markDirty();
        return;
      }

      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        for (const id of selectedIds) {
          store.deleteElement(id);
        }
        setSelectedIds([]);
        rendererRef.current?.markDirty();
        return;
      }

      // Escape
      if (e.key === 'Escape') {
        setSelectedIds([]);
        setActiveTool('select');
        setEditingTextId(null);
        setLineStart(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIds, store]);

  // Canvas mouse handlers
  const getCanvasPoint = useCallback(
    (e: React.MouseEvent): Point => {
      const rect = canvasRef.current!.getBoundingClientRect();
      return screenToCanvas(e.clientX - rect.left, e.clientY - rect.top, viewport.x, viewport.y, viewport.zoom);
    },
    [viewport]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const point = getCanvasPoint(e);
      const renderer = rendererRef.current!;

      // Update cursor
      store.awareness.updateLocalCursor(point);

      switch (activeTool) {
        case 'hand':
          setDragState({ type: 'pan', startX: e.clientX, startY: e.clientY });
          break;

        case 'select': {
          // Check if clicking on resize handle of selected element
          if (selectedIds.length === 1) {
            const el = elements.find(elem => elem.id === selectedIds[0]);
            if (el) {
              const handles = renderer.getCanvas().getContext('2d')!; // We don't have access to element renderer here
              // Check handle proximity
              const handleIdx = checkResizeHandle(point, el);
              if (handleIdx >= 0) {
                setDragState({ type: 'resize', startX: e.clientX, startY: e.clientY, elementId: el.id, handleIndex: handleIdx });
                return;
              }
            }
          }

          // Hit test elements
          const hit = renderer.getSpatialIndex().pointQuery(point, elements);
          if (hit) {
            if (e.shiftKey) {
              setSelectedIds(prev => prev.includes(hit.id) ? prev.filter(id => id !== hit.id) : [...prev, hit.id]);
            } else {
              setSelectedIds([hit.id]);
            }
            setDragState({ type: 'select', startX: e.clientX, startY: e.clientY, elementId: hit.id });
            store.awareness.updateLocalSelection([hit.id]);
          } else {
            // Check connection hit
            const conn = renderer.getSpatialIndex().connectionHitTest(point, connections, elements);
            if (!conn) {
              setSelectedIds([]);
              store.awareness.updateLocalSelection([]);
            }
            // Start selection rectangle
            setDragState({ type: 'select', startX: e.clientX, startY: e.clientY });
          }
          break;
        }

        case 'pen':
          setIsDrawing(true);
          setPenPoints([point]);
          setDragState({ type: 'draw', startX: point.x, startY: point.y });
          break;

        case 'line': {
          const hit = renderer.getSpatialIndex().pointQuery(point, elements);
          if (hit) {
            setLineStart({ elementId: hit.id, anchor: 'auto' });
          }
          break;
        }

        case 'comment': {
          const commentId = nanoid();
          const newComment: Comment = {
            id: commentId,
            x: point.x,
            y: point.y,
            author: store.awareness.localState.userName,
            text: '',
            createdAt: Date.now(),
            resolved: false,
            replies: [],
          };
          store.addComment(newComment);
          setActivePanel('comments');
          break;
        }

        default: {
          // Drawing tools: rectangle, ellipse, text, frame
          setDragState({ type: 'draw', startX: point.x, startY: point.y });
          break;
        }
      }
    },
    [activeTool, elements, connections, selectedIds, store, getCanvasPoint, viewport]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const point = getCanvasPoint(e);
      store.awareness.updateLocalCursor(point);

      const renderer = rendererRef.current!;

      if (dragState.type === 'pan') {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        setDragState(prev => ({ ...prev, startX: e.clientX, startY: e.clientY }));
        renderer.markDirty();
        return;
      }

      if (dragState.type === 'resize' && dragState.elementId) {
        const el = elements.find(elem => elem.id === dragState.elementId);
        if (!el) return;
        const dx = (e.clientX - dragState.startX) / viewport.zoom;
        const dy = (e.clientY - dragState.startY) / viewport.zoom;
        const updates: Partial<WhiteboardElement> = {};

        switch (dragState.handleIndex) {
          case 0: updates.x = el.x + dx; updates.y = el.y + dy; updates.width = el.width - dx; updates.height = el.height - dy; break;
          case 1: updates.y = el.y + dy; updates.height = el.height - dy; break;
          case 2: updates.width = el.width + dx; updates.y = el.y + dy; updates.height = el.height - dy; break;
          case 3: updates.width = el.width + dx; break;
          case 4: updates.width = el.width + dx; updates.height = el.height + dy; break;
          case 5: updates.height = el.height + dy; break;
          case 6: updates.x = el.x + dx; updates.width = el.width - dx; updates.height = el.height + dy; break;
          case 7: updates.x = el.x + dx; updates.width = el.width - dx; break;
        }

        if (updates.width && updates.width < 10) updates.width = 10;
        if (updates.height && updates.height < 10) updates.height = 10;

        store.updateElement(el.id, updates);
        setDragState(prev => ({ ...prev, startX: e.clientX, startY: e.clientY }));
        renderer.markDirty();
        return;
      }

      if (dragState.type === 'select' && dragState.elementId) {
        const dx = (e.clientX - dragState.startX) / viewport.zoom;
        const dy = (e.clientY - dragState.startY) / viewport.zoom;
        const el = elements.find(elem => elem.id === dragState.elementId);
        if (el && (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1)) {
          store.updateElement(dragState.elementId, { x: el.x + dx, y: el.y + dy });
          setDragState(prev => ({ ...prev, startX: e.clientX, startY: e.clientY }));
          renderer.markDirty();
        }
        return;
      }

      if (dragState.type === 'draw' && activeTool === 'pen') {
        setPenPoints(prev => [...prev, point]);
        renderer.markDirty();
        return;
      }
    },
    [dragState, activeTool, elements, store, getCanvasPoint, viewport]
  );

  const handleCanvasMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const point = getCanvasPoint(e);
      const renderer = rendererRef.current!;

      if (dragState.type === 'draw' && activeTool === 'pen' && penPoints.length > 1) {
        const bb = getBoundingBox(penPoints);
        const newElement: WhiteboardElement = {
          id: nanoid(),
          type: 'pen-path',
          x: bb.x,
          y: bb.y,
          width: bb.width || 100,
          height: bb.height || 100,
          rotation: 0,
          zIndex: elements.length,
          style: { ...DEFAULT_ELEMENT_STYLE, fillColor: 'transparent', strokeColor: '#1a1a2e', strokeWidth: 3 },
          opacity: 1,
          locked: false,
          visible: true,
          penPoints: [...penPoints],
        };
        store.addElement(newElement);
        renderer.spawnCreationEffect(point.x, point.y);
        renderer.markDirty();
      }

      if (dragState.type === 'draw' && activeTool === 'rectangle') {
        const { startX, startY } = dragState;
        const newElement: WhiteboardElement = {
          id: nanoid(),
          type: 'rectangle',
          x: Math.min(startX, point.x),
          y: Math.min(startY, point.y),
          width: Math.abs(point.x - startX) || 100,
          height: Math.abs(point.y - startY) || 100,
          rotation: 0,
          zIndex: elements.length,
          style: { ...DEFAULT_ELEMENT_STYLE },
          opacity: 1,
          locked: false,
          visible: true,
        };
        store.addElement(newElement);
        renderer.spawnCreationEffect(point.x, point.y);
        renderer.markDirty();
      }

      if (dragState.type === 'draw' && activeTool === 'ellipse') {
        const { startX, startY } = dragState;
        const newElement: WhiteboardElement = {
          id: nanoid(),
          type: 'ellipse',
          x: Math.min(startX, point.x),
          y: Math.min(startY, point.y),
          width: Math.abs(point.x - startX) || 100,
          height: Math.abs(point.y - startY) || 100,
          rotation: 0,
          zIndex: elements.length,
          style: { ...DEFAULT_ELEMENT_STYLE },
          opacity: 1,
          locked: false,
          visible: true,
        };
        store.addElement(newElement);
        renderer.spawnCreationEffect(point.x, point.y);
        renderer.markDirty();
      }

      if (dragState.type === 'draw' && activeTool === 'text') {
        const newElement: WhiteboardElement = {
          id: nanoid(),
          type: 'text',
          x: point.x,
          y: point.y,
          width: 200,
          height: 40,
          rotation: 0,
          zIndex: elements.length,
          style: { ...DEFAULT_ELEMENT_STYLE, fillColor: 'transparent', strokeColor: 'transparent', strokeWidth: 0 },
          textContent: { ...DEFAULT_TEXT_CONTENT },
          opacity: 1,
          locked: false,
          visible: true,
        };
        store.addElement(newElement);
        setEditingTextId(newElement.id);
        renderer.spawnCreationEffect(point.x, point.y);
        renderer.markDirty();
      }

      if (dragState.type === 'draw' && activeTool === 'frame') {
        const { startX, startY } = dragState;
        const newElement: WhiteboardElement = {
          id: nanoid(),
          type: 'frame',
          x: Math.min(startX, point.x),
          y: Math.min(startY, point.y),
          width: Math.abs(point.x - startX) || 300,
          height: Math.abs(point.y - startY) || 300,
          rotation: 0,
          zIndex: elements.length,
          style: { ...DEFAULT_ELEMENT_STYLE, fillColor: '#f0f4ff', strokeColor: '#4d96ff' },
          opacity: 1,
          locked: false,
          visible: true,
          textContent: { ...DEFAULT_TEXT_CONTENT, text: 'Frame' },
        };
        store.addElement(newElement);
        renderer.spawnCreationEffect(point.x, point.y);
        renderer.markDirty();
      }

      if (activeTool === 'line' && lineStart && point) {
        const hit = renderer.getSpatialIndex().pointQuery(point, elements);
        if (hit && hit.id !== lineStart.elementId) {
          const newConn: Connection = {
            id: nanoid(),
            sourceId: lineStart.elementId,
            targetId: hit.id,
            sourceAnchor: 'auto',
            targetAnchor: 'auto',
            style: {
              strokeColor: '#6c757d',
              strokeWidth: 2,
              strokeStyle: 'solid',
              endArrow: 'arrow',
              curvature: 0.3,
            },
            zIndex: 0,
          };
          store.addConnection(newConn);
          renderer.markDirty();
        }
        setLineStart(null);
      }

      setIsDrawing(false);
      setPenPoints([]);
      setDragState({ type: 'none', startX: 0, startY: 0 });
    },
    [dragState, activeTool, penPoints, elements, lineStart, store, getCanvasPoint]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = canvasRef.current!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setViewport(prev => {
        const newZoom = Math.max(0.01, Math.min(100, prev.zoom * zoomFactor));
        const worldX = (mouseX - prev.x) / prev.zoom;
        const worldY = (mouseY - prev.y) / prev.zoom;
        return {
          zoom: newZoom,
          x: mouseX - worldX * newZoom,
          y: mouseY - worldY * newZoom,
        };
      });
      rendererRef.current?.markDirty();
    },
    []
  );

  // Export
  const handleExport = useCallback((format: 'png' | 'svg') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (format === 'png') {
      const link = document.createElement('a');
      link.download = `whiteboard-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } else {
      // SVG export could use canvas.toDataURL or a proper SVG serializer
      alert('SVG export coming soon!');
    }
  }, []);

  // AI functions
  const handleAILayout = useCallback(() => {
    const result = aiOptimizeLayout(elements);
    for (const el of result.elements) {
      store.updateElement(el.id, { x: el.x, y: el.y });
    }
    rendererRef.current?.markDirty();
  }, [elements, store]);

  const handleAIMindMap = useCallback(() => {
    const result = aiGenerateMindMap('Central Idea', ['Topic A', 'Topic B', 'Topic C', 'Topic D', 'Topic E'], 0, 0);
    for (const el of result.elements) {
      store.schema.addElement(el);
    }
    for (const conn of result.connections) {
      store.schema.addConnection(conn);
    }
    rendererRef.current?.markDirty();
  }, [store]);

  const handleAIDiagram = useCallback(() => {
    const result = aiGenerateDiagram('flowchart', 0, 0);
    for (const el of result.elements) {
      store.schema.addElement(el);
    }
    for (const conn of result.connections) {
      store.schema.addConnection(conn);
    }
    rendererRef.current?.markDirty();
  }, [store]);

  // Mind map layout for selected elements
  const handleMindMapLayout = useCallback(() => {
    if (selectedIds.length === 0) return;
    const rootEl = elements.find(e => e.id === selectedIds[0]);
    if (!rootEl) return;

    const result = layoutMindMap(rootEl, elements, connections);
    for (const el of result.elements) {
      store.updateElement(el.id, { x: el.x, y: el.y, width: el.width, height: el.height });
    }
    rendererRef.current?.markDirty();
  }, [selectedIds, elements, connections, store]);

  // Auto layout for selected elements in a frame
  const handleAutoLayout = useCallback(() => {
    if (selectedIds.length < 2) return;
    const frame = elements.find(e => e.type === 'frame' && selectedIds.includes(e.id));
    if (!frame) return;

    const children = elements.filter(e => selectedIds.includes(e.id) && e.id !== frame.id);
    const layout = suggestAutoLayout(children) || {
      enabled: true,
      direction: 'horizontal' as const,
      gap: 16,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      align: 'left' as const,
      wrap: false,
    };

    const updated = applyAutoLayout(frame, children, layout);
    for (const el of updated) {
      store.updateElement(el.id, { x: el.x, y: el.y });
    }
    rendererRef.current?.markDirty();
  }, [selectedIds, elements, store]);

  // Comment actions
  const handleResolveComment = useCallback((id: string) => {
    store.schema.resolveComment(id);
    rendererRef.current?.markDirty();
  }, [store]);

  const handleReplyComment = useCallback((commentId: string, text: string) => {
    const comment = store.schema.comments.get(commentId);
    if (comment) {
      const reply = {
        id: nanoid(),
        author: store.awareness.localState.userName,
        text,
        createdAt: Date.now(),
      };
      comment.replies.push(reply);
      store.schema.comments.set(commentId, comment);
      rendererRef.current?.markDirty();
    }
  }, [store]);

  // Layer actions
  const handleToggleVisibility = useCallback((id: string) => {
    const el = store.schema.getElement(id);
    if (el) store.updateElement(id, { visible: !el.visible });
    rendererRef.current?.markDirty();
  }, [store]);

  const handleToggleLock = useCallback((id: string) => {
    const el = store.schema.getElement(id);
    if (el) store.updateElement(id, { locked: !el.locked });
  }, [store]);

  const handleReorder = useCallback((id: string, direction: 'up' | 'down') => {
    const el = store.schema.getElement(id);
    if (!el) return;
    const newZ = direction === 'up' ? el.zIndex + 1 : el.zIndex - 1;
    store.updateElement(id, { zIndex: newZ });
    rendererRef.current?.markDirty();
  }, [store]);

  // Text editing
  const handleTextEdit = useCallback((id: string) => {
    setEditingTextId(id);
    const el = store.schema.getElement(id);
    if (!el) return;

    // Create a hidden input for text editing at the element's position
    const input = document.createElement('textarea');
    input.value = el.textContent?.text || '';
    input.style.position = 'absolute';
    input.style.left = `${el.x * viewport.zoom + viewport.x}px`;
    input.style.top = `${el.y * viewport.zoom + viewport.y}px`;
    input.style.width = `${el.width * viewport.zoom}px`;
    input.style.height = `${el.height * viewport.zoom}px`;
    input.style.fontSize = `${(el.textContent?.fontSize || 16) * viewport.zoom}px`;
    input.style.fontFamily = el.textContent?.fontFamily || 'Inter, sans-serif';
    input.style.zIndex = '1000';
    input.style.border = '2px solid #4d96ff';
    input.style.outline = 'none';
    input.style.padding = '8px';
    input.style.borderRadius = '4px';
    input.style.resize = 'none';
    input.style.background = 'white';

    const container = containerRef.current;
    if (!container) return;
    container.appendChild(input);
    input.focus();
    input.select();

    const commit = () => {
      const newText = input.value;
      store.updateElement(id, {
        textContent: { ...el.textContent!, text: newText },
      });
      input.remove();
      setEditingTextId(null);
      rendererRef.current?.markDirty();
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        input.remove();
        setEditingTextId(null);
      }
      if (e.key === 'Enter' && e.ctrlKey) {
        commit();
      }
    });
  }, [store, viewport]);

  // Double click to edit text
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const point = getCanvasPoint(e);
      const renderer = rendererRef.current!;
      const hit = renderer.getSpatialIndex().pointQuery(point, elements);
      if (hit && hit.type === 'text') {
        handleTextEdit(hit.id);
      }
    },
    [elements, getCanvasPoint, handleTextEdit]
  );

  const selectedElement = selectedIds.length === 1 ? elements.find(e => e.id === selectedIds[0]) || null : null;

  return (
    <div className="app-container">
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onUndo={() => { store.undoManager.undo(); rendererRef.current?.markDirty(); }}
        onRedo={() => { store.undoManager.redo(); rendererRef.current?.markDirty(); }}
        canUndo={store.undoManager.canUndo()}
        canRedo={store.undoManager.canRedo()}
        onlineUsers={remoteUsers.length + 1}
        connected={connected}
        onExport={handleExport}
        onAILayout={handleAILayout}
        onAIMindMap={handleAIMindMap}
        onAIDiagram={handleAIDiagram}
      />

      <div className="main-area">
        <div className="canvas-container" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className="canvas-main"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
          />
          <canvas
            ref={overlayRef}
            className="canvas-overlay"
            style={{ pointerEvents: 'none' }}
          />

          {/* Zoom controls */}
          <div className="zoom-controls">
            <button onClick={() => setViewport(p => ({ ...p, zoom: Math.min(100, p.zoom * 1.25) }))}>+</button>
            <span className="zoom-value">{Math.round(viewport.zoom * 100)}%</span>
            <button onClick={() => setViewport(p => ({ ...p, zoom: Math.max(0.01, p.zoom * 0.8) }))}>−</button>
            <button onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}>⊡</button>
          </div>

          {/* Minimap */}
          <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
            <Minimap
              elements={elements}
              viewportX={viewport.x}
              viewportY={viewport.y}
              zoom={viewport.zoom}
              canvasWidth={containerRef.current?.clientWidth || 1000}
              canvasHeight={containerRef.current?.clientHeight || 800}
              onNavigate={(x, y) => setViewport(prev => ({ ...prev, x, y }))}
            />
          </div>

          {/* Cursor info */}
          <div className="coordinates">
            {viewport.zoom < 1 ? `${Math.round(viewport.zoom * 100)}%` : `${Math.round(viewport.zoom * 100)}%`}
          </div>
        </div>

        {/* Side panels */}
        <div className="side-panels">
          <div className="panel-tabs">
            <button className={`panel-tab ${activePanel === 'layers' ? 'active' : ''}`} onClick={() => setActivePanel(p => p === 'layers' ? 'none' : 'layers')}>
              ☰ Layers
            </button>
            <button className={`panel-tab ${activePanel === 'properties' ? 'active' : ''}`} onClick={() => setActivePanel(p => p === 'properties' ? 'none' : 'properties')}>
              ⚙ Props
            </button>
            <button className={`panel-tab ${activePanel === 'comments' ? 'active' : ''}`} onClick={() => setActivePanel(p => p === 'comments' ? 'none' : 'comments')}>
              💬 ({comments.filter(c => !c.resolved).length})
            </button>
            <button className={`panel-tab ${activePanel === 'version' ? 'active' : ''}`} onClick={() => setActivePanel(p => p === 'version' ? 'none' : 'version')}>
              🕐 History
            </button>
          </div>

          {activePanel === 'layers' && (
            <LayersPanel
              elements={elements}
              selectedIds={selectedIds}
              onSelect={(id) => { setSelectedIds([id]); store.awareness.updateLocalSelection([id]); }}
              onDelete={(id) => { store.deleteElement(id); setSelectedIds(prev => prev.filter(x => x !== id)); rendererRef.current?.markDirty(); }}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
              onReorder={handleReorder}
            />
          )}

          {activePanel === 'properties' && (
            <PropertiesPanel
              element={selectedElement}
              onUpdate={(id, updates) => { store.updateElement(id, updates); rendererRef.current?.markDirty(); }}
            />
          )}

          {activePanel === 'comments' && (
            <CommentsPanel
              comments={comments}
              onResolve={handleResolveComment}
              onReply={handleReplyComment}
            />
          )}

          {activePanel === 'version' && (
            <VersionHistory store={store} />
          )}

          {/* Quick actions */}
          {activePanel !== 'none' && selectedIds.length > 0 && (
            <div className="quick-actions">
              {selectedIds.length >= 2 && (
                <>
                  <button className="btn-action" onClick={handleMindMapLayout}>🧠 Mind Map Layout</button>
                  <button className="btn-action" onClick={handleAutoLayout}>📐 Auto Layout</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function checkResizeHandle(point: Point, element: WhiteboardElement): number {
  const handles = [
    { x: element.x, y: element.y },
    { x: element.x + element.width / 2, y: element.y },
    { x: element.x + element.width, y: element.y },
    { x: element.x + element.width, y: element.y + element.height / 2 },
    { x: element.x + element.width, y: element.y + element.height },
    { x: element.x + element.width / 2, y: element.y + element.height },
    { x: element.x, y: element.y + element.height },
    { x: element.x, y: element.y + element.height / 2 },
  ];

  const threshold = 8;
  for (let i = 0; i < handles.length; i++) {
    const dx = point.x - handles[i].x;
    const dy = point.y - handles[i].y;
    if (Math.sqrt(dx * dx + dy * dy) < threshold) return i;
  }
  return -1;
}

function getBoundingBox(points: Point[]): { x: number; y: number; width: number; height: number } {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
