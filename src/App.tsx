import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { PdfViewer } from './components/PdfViewer';
import { Toolbar } from './components/Toolbar';
import { RoutePanel } from './components/RoutePanel';
import { UploadModal } from './components/UploadModal';
import {
  loadRoutes, addRoute, updateRoute, deleteRoute,
  addAnnotation, deleteAnnotation as storeDeleteAnnotation,
  addWaypoint, deleteWaypoint as storeDeleteWaypoint,
  loadDrawings, saveDrawings,
} from './store';
import type { Route, Annotation, Waypoint, DrawingStroke, DrawingColor, WaypointType } from './types';
import { Bike, PanelRightClose, PanelRightOpen } from 'lucide-react';

type InteractionMode = 'pan' | 'annotate' | 'draw' | 'waypoint' | 'erase';

export default function App() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [mode, setMode] = useState<InteractionMode>('pan');
  const [drawColor, setDrawColor] = useState<DrawingColor>('#ef4444');
  const [drawWidth, setDrawWidth] = useState(4);
  const [waypointType, setWaypointType] = useState<WaypointType>('parking');
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);

  // Load routes on mount
  useEffect(() => {
    const stored = loadRoutes();
    setRoutes(stored);
    if (stored.length > 0) setActiveId(stored[0].id);
  }, []);

  const activeRoute = routes.find(r => r.id === activeId) ?? null;

  // Load drawings when active route changes
  useEffect(() => {
    if (activeId) {
      setStrokes(loadDrawings(activeId));
    } else {
      setStrokes([]);
    }
  }, [activeId]);

  // Persist drawings whenever they change
  useEffect(() => {
    if (activeId) saveDrawings(activeId, strokes);
  }, [strokes, activeId]);

  const refreshRoutes = () => setRoutes(loadRoutes());

  const handleSaveRoute = (route: Route) => {
    addRoute(route);
    refreshRoutes();
    setActiveId(route.id);
    setShowUpload(false);
  };

  const handleSelectRoute = (id: string) => {
    setActiveId(id);
    setMode('pan');
  };

  const handleDeleteRoute = (id: string) => {
    deleteRoute(id);
    const updated = loadRoutes();
    setRoutes(updated);
    if (activeId === id) {
      setActiveId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleToggleFavorite = (id: string) => {
    const route = routes.find(r => r.id === id);
    if (!route) return;
    updateRoute({ ...route, isFavorite: !route.isFavorite, updatedAt: new Date().toISOString() });
    refreshRoutes();
  };

  const handleUpdateRoute = (route: Route) => {
    updateRoute(route);
    refreshRoutes();
  };

  const handleAnnotationAdd = (ann: Annotation) => {
    if (!activeId) return;
    addAnnotation(activeId, ann);
    refreshRoutes();
  };

  const handleAnnotationDelete = (annId: string) => {
    if (!activeId) return;
    storeDeleteAnnotation(activeId, annId);
    refreshRoutes();
  };

  const handleWaypointAdd = (wp: Waypoint) => {
    if (!activeId) return;
    addWaypoint(activeId, wp);
    refreshRoutes();
  };

  const handleWaypointDelete = (wpId: string) => {
    if (!activeId) return;
    storeDeleteWaypoint(activeId, wpId);
    refreshRoutes();
  };

  const handleUndoStroke = useCallback(() => {
    setStrokes(prev => prev.slice(0, -1));
  }, []);

  const handleClearDrawings = useCallback(() => {
    setStrokes([]);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        routes={routes}
        activeRouteId={activeId}
        onSelectRoute={handleSelectRoute}
        onDeleteRoute={handleDeleteRoute}
        onToggleFavorite={handleToggleFavorite}
        onUpdateRoute={handleUpdateRoute}
        onUploadClick={() => setShowUpload(true)}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {activeRoute ? (
          <>
            <Toolbar
              mode={mode}
              setMode={setMode}
              drawColor={drawColor}
              setDrawColor={setDrawColor}
              drawWidth={drawWidth}
              setDrawWidth={setDrawWidth}
              waypointType={waypointType}
              setWaypointType={setWaypointType}
              onUndo={handleUndoStroke}
              onClearDrawings={handleClearDrawings}
              hasStrokes={strokes.length > 0}
              routeName={activeRoute.name}
            />
            <div className="flex flex-1 min-h-0">
              <PdfViewer
                route={activeRoute}
                mode={mode}
                drawColor={drawColor}
                drawWidth={drawWidth}
                waypointType={waypointType}
                strokes={strokes}
                onAnnotationAdd={handleAnnotationAdd}
                onAnnotationDelete={handleAnnotationDelete}
                onWaypointAdd={handleWaypointAdd}
                onWaypointDelete={handleWaypointDelete}
                onStrokesChange={setStrokes}
              />
              {/* Toggle panel button */}
              <button
                onClick={() => setShowPanel(p => !p)}
                className="absolute z-20 bg-slate-700 hover:bg-slate-600 text-slate-300 p-1.5 rounded-l border-l border-y border-slate-600 shadow"
                style={{ right: showPanel ? '288px' : '0', top: '50%', transform: 'translateY(-50%)' }}
                title={showPanel ? 'Hide details panel' : 'Show details panel'}
              >
                {showPanel ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
              </button>
              {showPanel && (
                <RoutePanel
                  route={activeRoute}
                  onUpdate={handleUpdateRoute}
                  onClose={() => setShowPanel(false)}
                  onDeleteAnnotation={handleAnnotationDelete}
                  onDeleteWaypoint={handleWaypointDelete}
                />
              )}
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="bg-slate-800 rounded-2xl p-10 border border-slate-700 max-w-sm">
              <Bike size={48} className="mx-auto mb-4 text-trail-500 opacity-60" />
              <h2 className="text-lg font-bold text-white mb-2">Welcome to TrailMap</h2>
              <p className="text-sm text-slate-400 mb-6">
                Upload your bike club's PDF maps for an interactive riding experience — annotate, highlight routes, log rides, and more.
              </p>
              <button
                onClick={() => setShowUpload(true)}
                className="bg-trail-600 hover:bg-trail-500 text-white px-6 py-2.5 rounded-lg font-medium text-sm"
              >
                Upload Your First Map
              </button>
              <div className="mt-6 grid grid-cols-2 gap-3 text-left">
                {[
                  ['🗺️', 'Zoom & Pan', 'Navigate maps like Google Maps'],
                  ['✏️', 'Draw Routes', 'Highlight your path on the map'],
                  ['📍', 'Waypoints', 'Mark parking, water, viewpoints'],
                  ['📝', 'Notes', 'Add notes at any map location'],
                  ['⭐', 'Favorites', 'Star your go-to routes'],
                  ['📅', 'Ride Log', 'Track every ride with conditions'],
                ].map(([icon, title, desc]) => (
                  <div key={String(title)} className="bg-slate-700/50 rounded-lg p-2.5">
                    <p className="text-sm mb-0.5">{icon} <span className="text-white font-medium">{title}</span></p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onSave={handleSaveRoute} />
      )}
    </div>
  );
}
