import { useState, useEffect, useCallback } from 'react';
import {
  MapContainer, TileLayer, ImageOverlay,
  Marker, Popup, Polyline, Circle,
  useMapEvents, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Navigation2, MapPin as MapPinIcon } from 'lucide-react';
import type { Route, Annotation, Waypoint, DrawingStroke, DrawingColor, WaypointType } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export type InteractionMode = 'pan' | 'annotate' | 'draw' | 'waypoint' | 'erase' | 'georeference';

interface Props {
  route: Route;
  mode: InteractionMode;
  drawColor: DrawingColor;
  drawWidth: number;
  waypointType: WaypointType;
  strokes: DrawingStroke[];
  overlayOpacity: number;
  onAnnotationAdd: (ann: Annotation) => void;
  onAnnotationDelete: (id: string) => void;
  onWaypointAdd: (wp: Waypoint) => void;
  onWaypointDelete: (id: string) => void;
  onStrokesChange: (strokes: DrawingStroke[]) => void;
  onBoundsSet: (bounds: [[number, number], [number, number]]) => void;
  onModeChange: (mode: InteractionMode) => void;
}

// Render PDF page 1 → PNG data URL for ImageOverlay
async function renderPdfPage(pdfData: string): Promise<string> {
  const base64 = pdfData.includes(',') ? pdfData.split(',')[1] : pdfData;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  const page = await doc.getPage(1);
  const scale = 1200 / page.getViewport({ scale: 1 }).width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas }).promise;
  return canvas.toDataURL('image/jpeg', 0.85);
}

// DivIcon helpers — avoids Leaflet default icon import issues
function annotationIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;background:${color};border:2.5px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.6)"></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8], className: '',
  });
}

const WAYPOINT_META: Record<WaypointType, { bg: string; emoji: string }> = {
  parking:   { bg: '#3b82f6', emoji: '🅿' },
  water:     { bg: '#06b6d4', emoji: '💧' },
  restroom:  { bg: '#8b5cf6', emoji: '🚻' },
  viewpoint: { bg: '#f59e0b', emoji: '👁' },
  caution:   { bg: '#ef4444', emoji: '⚠' },
  custom:    { bg: '#22c55e', emoji: '📍' },
};
function waypointIcon(type: WaypointType) {
  const { bg, emoji } = WAYPOINT_META[type];
  return L.divIcon({
    html: `<div style="width:28px;height:28px;background:${bg};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.5)">${emoji}</div>`,
    iconSize: [28, 28], iconAnchor: [14, 14], className: '',
  });
}
function georefIcon(label: string) {
  return L.divIcon({
    html: `<div style="background:#22c55e;color:white;font-size:11px;font-weight:bold;padding:2px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.4)">${label}</div>`,
    className: '', iconAnchor: [0, 0],
  });
}

// ─── Inner component (must live inside MapContainer for hooks) ───────────────
function MapContent({
  route, mode, drawColor, drawWidth, waypointType, strokes, overlayOpacity,
  onAnnotationDelete, onWaypointAdd, onWaypointDelete,
  onStrokesChange, onBoundsSet, onModeChange,
  pdfImageUrl, setPendingAnn, userPos,
}: Props & {
  pdfImageUrl: string | null;
  pendingAnn: { lat: number; lng: number } | null;
  setPendingAnn: (v: { lat: number; lng: number } | null) => void;
  userPos: [number, number] | null;
}) {
  const map = useMap();
  const [currentStroke, setCurrentStroke] = useState<{ lat: number; lng: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [georefStep, setGeorefStep] = useState(0);
  const [georefC1, setGeorefC1] = useState<[number, number] | null>(null);

  // Fit bounds when route changes
  useEffect(() => {
    if (route.bounds) {
      map.fitBounds(route.bounds, { padding: [40, 40] });
    }
  }, [route.id, route.bounds]);

  // Reset georeference state when mode changes away
  useEffect(() => {
    if (mode !== 'georeference') {
      setGeorefStep(0);
      setGeorefC1(null);
    }
  }, [mode]);

  // Disable map drag in draw/erase mode
  useEffect(() => {
    if (mode === 'draw' || mode === 'erase') {
      map.dragging.disable();
    } else {
      map.dragging.enable();
    }
  }, [mode, map]);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;

      if (mode === 'georeference') {
        if (georefStep === 0) {
          setGeorefC1([lat, lng]);
          setGeorefStep(1);
        } else if (georefStep === 1 && georefC1) {
          const bounds: [[number, number], [number, number]] = [
            [Math.min(lat, georefC1[0]), Math.min(lng, georefC1[1])],
            [Math.max(lat, georefC1[0]), Math.max(lng, georefC1[1])],
          ];
          onBoundsSet(bounds);
          setGeorefStep(0);
          setGeorefC1(null);
          onModeChange('pan');
        }
        return;
      }

      if (mode === 'annotate') { setPendingAnn({ lat, lng }); return; }

      if (mode === 'waypoint') {
        onWaypointAdd({ id: crypto.randomUUID(), lat, lng, type: waypointType, label: '' });
        return;
      }

      if (mode === 'erase') {
        const clickPx = map.latLngToContainerPoint(e.latlng);
        const threshold = 15;
        onStrokesChange(strokes.filter(s =>
          !s.points.some(p => {
            const px = map.latLngToContainerPoint([p.lat, p.lng]);
            return Math.hypot(px.x - clickPx.x, px.y - clickPx.y) < threshold;
          })
        ));
      }
    },

    mousedown(e) {
      if (mode === 'draw') {
        setIsDrawing(true);
        setCurrentStroke([{ lat: e.latlng.lat, lng: e.latlng.lng }]);
      }
    },
    mousemove(e) {
      if (mode === 'draw' && isDrawing) {
        setCurrentStroke(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
      }
    },
    mouseup(e) {
      if (mode === 'draw' && isDrawing) {
        setIsDrawing(false);
        if (currentStroke.length > 1) {
          onStrokesChange([...strokes, {
            id: crypto.randomUUID(),
            points: [...currentStroke, { lat: e.latlng.lat, lng: e.latlng.lng }],
            color: drawColor, width: drawWidth,
          }]);
        }
        setCurrentStroke([]);
      }
    },
  });

  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* PDF overlay */}
      {route.bounds && pdfImageUrl && (
        <ImageOverlay url={pdfImageUrl} bounds={route.bounds} opacity={overlayOpacity} />
      )}

      {/* Georeference corner 1 marker */}
      {georefC1 && <Marker position={georefC1} icon={georefIcon('Corner 1 ✓')} />}

      {/* Annotation markers */}
      {route.annotations.map(ann => (
        <Marker key={ann.id} position={[ann.lat, ann.lng]} icon={annotationIcon(ann.color)}>
          <Popup>
            <div style={{ fontSize: 13, minWidth: 140 }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>{ann.text}</p>
              <p style={{ color: '#6b7280', fontSize: 11, marginBottom: 6 }}>
                {new Date(ann.createdAt).toLocaleDateString()}
              </p>
              <button
                onClick={() => onAnnotationDelete(ann.id)}
                style={{ color: '#ef4444', fontSize: 11, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                Delete note
              </button>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Waypoint markers */}
      {route.waypoints.map(wp => (
        <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={waypointIcon(wp.type)}>
          <Popup>
            <div style={{ fontSize: 13, minWidth: 120 }}>
              <p style={{ fontWeight: 600, textTransform: 'capitalize', marginBottom: 4 }}>
                {WAYPOINT_META[wp.type].emoji} {wp.type}
              </p>
              {wp.label && <p style={{ color: '#6b7280', fontSize: 11, marginBottom: 6 }}>{wp.label}</p>}
              <button
                onClick={() => onWaypointDelete(wp.id)}
                style={{ color: '#ef4444', fontSize: 11, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                Remove
              </button>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Saved drawing strokes */}
      {strokes.map(stroke => (
        <Polyline
          key={stroke.id}
          positions={stroke.points.map(p => [p.lat, p.lng] as [number, number])}
          color={stroke.color} weight={stroke.width} lineCap="round" lineJoin="round"
        />
      ))}

      {/* Active drawing stroke */}
      {currentStroke.length > 1 && (
        <Polyline
          positions={currentStroke.map(p => [p.lat, p.lng] as [number, number])}
          color={drawColor} weight={drawWidth} lineCap="round" lineJoin="round"
        />
      )}

      {/* GPS user location */}
      {userPos && (
        <>
          <Circle center={userPos} radius={6} fillColor="#3b82f6" fillOpacity={1} color="white" weight={2} />
          <Circle center={userPos} radius={25} fillColor="#3b82f6" fillOpacity={0.15} color="#3b82f6" weight={1} />
        </>
      )}
    </>
  );
}

// ─── FlyTo helper (must be inside MapContainer) ──────────────────────────────
function FlyToController({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 15));
  }, [target]);
  return null;
}

// ─── Exported MapView ────────────────────────────────────────────────────────
export function MapView(props: Props) {
  const { route, mode, onModeChange } = props;
  const [pdfImageUrl, setPdfImageUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pendingAnn, setPendingAnn] = useState<{ lat: number; lng: number } | null>(null);
  const [annText, setAnnText] = useState('');
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  // Render PDF to image whenever route changes
  useEffect(() => {
    if (!route.pdfData) return;
    setPdfLoading(true);
    setPdfImageUrl(null);
    renderPdfPage(route.pdfData)
      .then(url => { setPdfImageUrl(url); setPdfLoading(false); })
      .catch(() => setPdfLoading(false));
  }, [route.id, route.pdfData]);

  const handleLocate = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coord: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(coord);
        setFlyTarget(coord);
        setTimeout(() => setFlyTarget(null), 100);
      },
      () => alert('Location not available. Please allow location access in your browser.'),
      { enableHighAccuracy: true }
    );
  }, []);

  const submitAnnotation = () => {
    if (!pendingAnn || !annText.trim()) return;
    props.onAnnotationAdd({
      id: crypto.randomUUID(),
      lat: pendingAnn.lat,
      lng: pendingAnn.lng,
      text: annText.trim(),
      color: '#f59e0b',
      createdAt: new Date().toISOString(),
    });
    setPendingAnn(null);
    setAnnText('');
  };

  const georefActive = mode === 'georeference';

  return (
    <div className="relative flex-1">
      <MapContainer
        center={[39.5, -98.35]}
        zoom={5}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <MapContent
          {...props}
          pdfImageUrl={pdfImageUrl}
          pendingAnn={pendingAnn}
          setPendingAnn={setPendingAnn}
          userPos={userPos}
        />
        <FlyToController target={flyTarget} />
      </MapContainer>

      {/* Georeference instruction banner */}
      {georefActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 border border-trail-500 text-white text-sm px-5 py-3 rounded-xl shadow-2xl text-center pointer-events-none">
          <p className="font-semibold text-trail-400 mb-1">Placing PDF on Map</p>
          <p className="text-slate-300">
            Navigate to your trail area, then click the <strong>top-left</strong> corner of your PDF map
          </p>
          <p className="text-xs text-slate-500 mt-1">Use scroll to zoom in first for better accuracy</p>
        </div>
      )}

      {/* No bounds prompt */}
      {!georefActive && !route.bounds && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-slate-800/95 border border-amber-500/50 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-3">
          <MapPinIcon size={18} className="text-amber-400 shrink-0" />
          <div>
            <p className="font-medium text-amber-300">PDF not placed on map yet</p>
            <p className="text-xs text-slate-400">Click "Place PDF" in the toolbar to overlay your trail map</p>
          </div>
          <button
            onClick={() => onModeChange('georeference')}
            className="ml-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
          >
            Place PDF
          </button>
        </div>
      )}

      {/* PDF loading indicator */}
      {pdfLoading && (
        <div className="absolute top-4 right-16 z-[1000] bg-slate-800/90 text-slate-300 text-xs px-3 py-1.5 rounded-full animate-pulse">
          Loading map overlay…
        </div>
      )}

      {/* My Location button */}
      <button
        onClick={handleLocate}
        title="My Location"
        className="absolute bottom-8 right-4 z-[1000] bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-full shadow-lg border border-slate-600"
      >
        <Navigation2 size={18} />
      </button>

      {/* Pending annotation input */}
      {pendingAnn && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-2xl flex gap-2 items-center min-w-[320px]">
          <input
            autoFocus
            value={annText}
            onChange={e => setAnnText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitAnnotation(); if (e.key === 'Escape') setPendingAnn(null); }}
            placeholder="Add a note at this location…"
            className="flex-1 bg-slate-700 text-white text-sm rounded px-3 py-1.5 outline-none border border-slate-500 focus:border-amber-400"
          />
          <button onClick={submitAnnotation} className="bg-amber-500 hover:bg-amber-400 text-black text-sm px-3 py-1.5 rounded font-medium">Save</button>
          <button onClick={() => setPendingAnn(null)} className="text-slate-400 hover:text-white text-sm px-2">✕</button>
        </div>
      )}
    </div>
  );
}
