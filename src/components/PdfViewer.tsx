import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Route, Annotation, Waypoint, DrawingStroke, DrawingColor, WaypointType } from '../types';
import { WaypointIcon } from './WaypointIcon';

// Bundle worker via Vite — works reliably in dev and production
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

type InteractionMode = 'pan' | 'annotate' | 'draw' | 'waypoint' | 'erase';

interface Props {
  route: Route;
  mode: InteractionMode;
  drawColor: DrawingColor;
  drawWidth: number;
  waypointType: WaypointType;
  strokes: DrawingStroke[];
  onAnnotationAdd: (ann: Annotation) => void;
  onAnnotationDelete: (id: string) => void;
  onWaypointAdd: (wp: Waypoint) => void;
  onWaypointDelete: (id: string) => void;
  onStrokesChange: (strokes: DrawingStroke[]) => void;
}

export function PdfViewer({
  route,
  mode,
  drawColor,
  drawWidth,
  waypointType,
  strokes,
  onAnnotationAdd,
  onAnnotationDelete,
  onWaypointAdd,
  onWaypointDelete,
  onStrokesChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [activeAnn, setActiveAnn] = useState<string | null>(null);
  const [annText, setAnnText] = useState('');
  const [pendingAnn, setPendingAnn] = useState<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // Load PDF from base64
  useEffect(() => {
    if (!route.pdfData) return;
    const base64 = route.pdfData.includes(',') ? route.pdfData.split(',')[1] : route.pdfData;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    pdfjsLib.getDocument({ data: bytes }).promise.then(doc => {
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
    });
  }, [route.pdfData]);

  // Render current page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }
    pdfDoc.getPage(currentPage).then(page => {
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      setCanvasSize({ w: viewport.width, h: viewport.height });
      const task = page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas });
      renderTaskRef.current = task;
      task.promise.then(() => {
        renderTaskRef.current = null;
        redrawOverlay();
      }).catch(() => {});
    });
  }, [pdfDoc, currentPage, scale]);

  const redrawOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    const ctx = overlay.getContext('2d')!;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    // Draw saved strokes for current page
    strokes.filter(s => s.page === currentPage).forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
      }
      ctx.stroke();
    });
  }, [strokes, currentPage]);

  useEffect(() => {
    redrawOverlay();
  }, [strokes, currentPage, canvasSize, redrawOverlay]);

  // Zoom with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(s => Math.min(5, Math.max(0.3, s + delta)));
  }, []);

  // Convert screen coords to canvas-relative coords
  const toCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / canvas.width,
      y: (clientY - rect.top) / canvas.height,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    } else if (mode === 'draw') {
      setIsDrawing(true);
      const coords = toCanvasCoords(e.clientX, e.clientY);
      currentStrokeRef.current = [coords];
    } else if (mode === 'erase') {
      // Erase strokes near click
      const coords = toCanvasCoords(e.clientX, e.clientY);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const threshold = 0.02;
      const remaining = strokes.filter(s => {
        if (s.page !== currentPage) return true;
        return !s.points.some(p =>
          Math.hypot(p.x - coords.x, p.y - coords.y) < threshold
        );
      });
      onStrokesChange(remaining);
    }
  }, [mode, offset, toCanvasCoords, strokes, currentPage, onStrokesChange]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (mode === 'pan' && isPanning) {
      setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (mode === 'draw' && isDrawing) {
      const coords = toCanvasCoords(e.clientX, e.clientY);
      currentStrokeRef.current.push(coords);
      // Live draw on overlay
      const overlay = overlayRef.current;
      const canvas = canvasRef.current;
      if (overlay && canvas && currentStrokeRef.current.length >= 2) {
        const ctx = overlay.getContext('2d')!;
        const pts = currentStrokeRef.current;
        const prev = pts[pts.length - 2];
        const curr = pts[pts.length - 1];
        ctx.beginPath();
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = drawWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height);
        ctx.lineTo(curr.x * canvas.width, curr.y * canvas.height);
        ctx.stroke();
      }
    }
  }, [mode, isPanning, panStart, isDrawing, toCanvasCoords, drawColor, drawWidth]);

  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    if (mode === 'pan') {
      setIsPanning(false);
    } else if (mode === 'draw' && isDrawing) {
      setIsDrawing(false);
      if (currentStrokeRef.current.length > 1) {
        const newStroke: DrawingStroke = {
          id: crypto.randomUUID(),
          page: currentPage,
          points: [...currentStrokeRef.current],
          color: drawColor,
          width: drawWidth,
        };
        onStrokesChange([...strokes, newStroke]);
      }
      currentStrokeRef.current = [];
    }
  }, [mode, isDrawing, currentPage, drawColor, drawWidth, strokes, onStrokesChange]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (mode === 'annotate') {
      const coords = toCanvasCoords(e.clientX, e.clientY);
      setPendingAnn(coords);
      setAnnText('');
    } else if (mode === 'waypoint') {
      const coords = toCanvasCoords(e.clientX, e.clientY);
      const wp: Waypoint = {
        id: crypto.randomUUID(),
        x: coords.x,
        y: coords.y,
        page: currentPage,
        type: waypointType,
        label: '',
      };
      onWaypointAdd(wp);
    }
  }, [mode, toCanvasCoords, currentPage, waypointType, onWaypointAdd]);

  const submitAnnotation = () => {
    if (!pendingAnn || !annText.trim()) return;
    const ann: Annotation = {
      id: crypto.randomUUID(),
      x: pendingAnn.x,
      y: pendingAnn.y,
      page: currentPage,
      text: annText.trim(),
      color: '#f59e0b',
      createdAt: new Date().toISOString(),
    };
    onAnnotationAdd(ann);
    setPendingAnn(null);
    setAnnText('');
  };

  const pageAnnotations = route.annotations.filter(a => a.page === currentPage);
  const pageWaypoints = route.waypoints.filter(w => w.page === currentPage);

  const modeClass = mode === 'pan' ? (isPanning ? 'panning' : '') :
    mode === 'annotate' ? 'annotating' :
    mode === 'draw' || mode === 'erase' ? 'drawing' :
    mode === 'waypoint' ? 'waypointing' : '';

  return (
    <div className="relative flex-1 overflow-hidden bg-slate-900 flex flex-col">
      {/* Page nav */}
      {totalPages > 1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-slate-800/90 backdrop-blur rounded-full px-3 py-1.5 border border-slate-600">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="text-slate-300 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-200">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="text-slate-300 hover:text-white disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-30 flex flex-col gap-1">
        <button
          onClick={() => setScale(s => Math.min(5, s + 0.2))}
          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded text-white text-lg font-bold flex items-center justify-center shadow"
        >+</button>
        <button
          onClick={() => setScale(1.0)}
          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-xs flex items-center justify-center shadow"
        >{Math.round(scale * 100)}%</button>
        <button
          onClick={() => setScale(s => Math.max(0.3, s - 0.2))}
          className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded text-white text-lg font-bold flex items-center justify-center shadow"
        >−</button>
      </div>

      {/* Pan/zoom viewport */}
      <div
        ref={containerRef}
        className={`pdf-viewport flex-1 overflow-hidden relative ${modeClass}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCanvasClick}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0, left: 0,
          }}
        >
          {/* PDF canvas */}
          <canvas ref={canvasRef} style={{ display: 'block' }} />
          {/* Drawing overlay */}
          <canvas
            ref={overlayRef}
            style={{
              position: 'absolute', top: 0, left: 0,
              pointerEvents: 'none',
            }}
          />

          {/* Annotation dots */}
          {pageAnnotations.map(ann => (
            <div
              key={ann.id}
              className="ann-dot"
              style={{
                left: `${ann.x * (canvasSize.w || 1)}px`,
                top: `${ann.y * (canvasSize.h || 1)}px`,
                background: ann.color,
              }}
              onClick={e => { e.stopPropagation(); setActiveAnn(activeAnn === ann.id ? null : ann.id); }}
            >
              {activeAnn === ann.id && (
                <div className="tooltip" style={{ top: '22px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto', minWidth: '160px' }}>
                  <p className="text-xs text-slate-200 mb-1">{ann.text}</p>
                  <p className="text-xs text-slate-500 mb-2">{new Date(ann.createdAt).toLocaleDateString()}</p>
                  <button
                    onClick={e => { e.stopPropagation(); onAnnotationDelete(ann.id); setActiveAnn(null); }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >Delete note</button>
                </div>
              )}
            </div>
          ))}

          {/* Waypoint icons */}
          {pageWaypoints.map(wp => (
            <div
              key={wp.id}
              className="wp-icon"
              style={{
                left: `${wp.x * (canvasSize.w || 1)}px`,
                top: `${wp.y * (canvasSize.h || 1)}px`,
              }}
              onClick={e => { e.stopPropagation(); onWaypointDelete(wp.id); }}
              title={`${wp.type}${wp.label ? ' — ' + wp.label : ''} (click to remove)`}
            >
              <WaypointIcon type={wp.type} size={22} />
            </div>
          ))}
        </div>
      </div>

      {/* Pending annotation input */}
      {pendingAnn && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl flex gap-2 items-center min-w-[320px]">
          <input
            autoFocus
            value={annText}
            onChange={e => setAnnText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitAnnotation(); if (e.key === 'Escape') { setPendingAnn(null); } }}
            placeholder="Add a note..."
            className="flex-1 bg-slate-700 text-white text-sm rounded px-3 py-1.5 outline-none border border-slate-500 focus:border-amber-400"
          />
          <button onClick={submitAnnotation} className="bg-amber-500 hover:bg-amber-400 text-black text-sm px-3 py-1.5 rounded font-medium">Save</button>
          <button onClick={() => setPendingAnn(null)} className="text-slate-400 hover:text-white text-sm px-2 py-1.5">✕</button>
        </div>
      )}
    </div>
  );
}
