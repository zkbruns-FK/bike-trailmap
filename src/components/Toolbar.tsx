import {
  Hand, MessageSquarePlus, Pencil, Eraser, MapPin,
  Undo2, Trash2, Save
} from 'lucide-react';
import type { DrawingColor, WaypointType } from '../types';

type InteractionMode = 'pan' | 'annotate' | 'draw' | 'waypoint' | 'erase';

interface Props {
  mode: InteractionMode;
  setMode: (m: InteractionMode) => void;
  drawColor: DrawingColor;
  setDrawColor: (c: DrawingColor) => void;
  drawWidth: number;
  setDrawWidth: (w: number) => void;
  waypointType: WaypointType;
  setWaypointType: (t: WaypointType) => void;
  onUndo: () => void;
  onClearDrawings: () => void;
  hasStrokes: boolean;
  routeName: string;
}

const COLORS: DrawingColor[] = ['#ef4444', '#3b82f6', '#f59e0b', '#22c55e', '#a855f7'];
const COLOR_NAMES: Record<DrawingColor, string> = {
  '#ef4444': 'Red',
  '#3b82f6': 'Blue',
  '#f59e0b': 'Amber',
  '#22c55e': 'Green',
  '#a855f7': 'Purple',
};

const WAYPOINTS: { type: WaypointType; emoji: string; label: string }[] = [
  { type: 'parking',   emoji: '🅿', label: 'Parking' },
  { type: 'water',     emoji: '💧', label: 'Water' },
  { type: 'restroom',  emoji: '🚻', label: 'Restroom' },
  { type: 'viewpoint', emoji: '👁', label: 'Viewpoint' },
  { type: 'caution',   emoji: '⚠', label: 'Caution' },
  { type: 'custom',    emoji: '📍', label: 'Custom' },
];

export function Toolbar({
  mode, setMode,
  drawColor, setDrawColor,
  drawWidth, setDrawWidth,
  waypointType, setWaypointType,
  onUndo, onClearDrawings,
  hasStrokes,
  routeName,
}: Props) {
  return (
    <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center gap-3 flex-wrap">
      {/* Route name */}
      <span className="text-sm font-semibold text-trail-400 mr-2 truncate max-w-[160px]">{routeName}</span>
      <div className="w-px h-5 bg-slate-600" />

      {/* Mode buttons */}
      <div className="flex items-center gap-1">
        <ToolBtn active={mode === 'pan'} onClick={() => setMode('pan')} title="Pan / Navigate">
          <Hand size={16} />
        </ToolBtn>
        <ToolBtn active={mode === 'annotate'} onClick={() => setMode('annotate')} title="Add Note (click map)">
          <MessageSquarePlus size={16} />
        </ToolBtn>
        <ToolBtn active={mode === 'draw'} onClick={() => setMode('draw')} title="Draw / Highlight Route">
          <Pencil size={16} />
        </ToolBtn>
        <ToolBtn active={mode === 'erase'} onClick={() => setMode('erase')} title="Erase Drawings">
          <Eraser size={16} />
        </ToolBtn>
        <ToolBtn active={mode === 'waypoint'} onClick={() => setMode('waypoint')} title="Drop Waypoint">
          <MapPin size={16} />
        </ToolBtn>
      </div>

      <div className="w-px h-5 bg-slate-600" />

      {/* Draw color */}
      {(mode === 'draw') && (
        <>
          <div className="flex items-center gap-1">
            {COLORS.map(c => (
              <button
                key={c}
                title={COLOR_NAMES[c]}
                onClick={() => setDrawColor(c)}
                style={{ background: c }}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${drawColor === c ? 'border-white scale-125' : 'border-transparent scale-100'}`}
              />
            ))}
          </div>
          <div className="w-px h-5 bg-slate-600" />
          {/* Line width */}
          <div className="flex items-center gap-1.5">
            {[2, 4, 7].map(w => (
              <button
                key={w}
                onClick={() => setDrawWidth(w)}
                title={`Width ${w}`}
                className={`flex items-center justify-center w-8 h-6 rounded transition-colors ${drawWidth === w ? 'bg-slate-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
              >
                <div style={{ width: 18, height: w, background: 'currentColor', borderRadius: 1 }} />
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-slate-600" />
        </>
      )}

      {/* Waypoint type */}
      {mode === 'waypoint' && (
        <>
          <div className="flex items-center gap-1">
            {WAYPOINTS.map(({ type, emoji, label }) => (
              <button
                key={type}
                title={label}
                onClick={() => setWaypointType(type)}
                className={`w-7 h-7 rounded text-base flex items-center justify-center border transition-colors ${
                  waypointType === type
                    ? 'border-white bg-slate-600'
                    : 'border-transparent bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-slate-600" />
        </>
      )}

      {/* Undo / Clear */}
      <button
        onClick={onUndo}
        disabled={!hasStrokes}
        title="Undo last stroke"
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white disabled:opacity-30 px-2 py-1 rounded hover:bg-slate-700"
      >
        <Undo2 size={14} />
      </button>
      <button
        onClick={onClearDrawings}
        disabled={!hasStrokes}
        title="Clear all drawings on this page"
        className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 disabled:opacity-30 px-2 py-1 rounded hover:bg-slate-700"
      >
        <Trash2 size={14} />
        <span>Clear</span>
      </button>

      <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
        <Save size={12} />
        <span>Auto-saved</span>
      </div>
    </div>
  );
}

function ToolBtn({
  active, onClick, title, children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
        active
          ? 'bg-trail-600 text-white'
          : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
