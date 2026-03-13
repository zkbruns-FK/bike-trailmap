import { useState } from 'react';
import {
  X, Edit3, Check, Plus, Trash2, Calendar, Clock,
  Cloud, MessageSquare, MapPin, Route, Mountain,
  Tag
} from 'lucide-react';
import type { Route as TrailRoute, RideLogEntry, Difficulty, TerrainType } from '../types';
import { WaypointIcon } from './WaypointIcon';

interface Props {
  route: TrailRoute;
  onUpdate: (r: TrailRoute) => void;
  onClose: () => void;
  onDeleteAnnotation: (id: string) => void;
  onDeleteWaypoint: (id: string) => void;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'moderate', 'hard', 'expert'];
const TERRAINS: TerrainType[] = ['trail', 'road', 'mixed', 'gravel'];

const DIFF_COLOR: Record<Difficulty, string> = {
  easy:     'bg-green-500/20 text-green-300 border-green-500/40',
  moderate: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  hard:     'bg-orange-500/20 text-orange-300 border-orange-500/40',
  expert:   'bg-red-500/20 text-red-300 border-red-500/40',
};

export function RoutePanel({ route, onUpdate, onClose, onDeleteAnnotation, onDeleteWaypoint }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(route.name);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descVal, setDescVal] = useState(route.description);
  const [tagInput, setTagInput] = useState('');
  const [showRideForm, setShowRideForm] = useState(false);
  const [rideDate, setRideDate] = useState(new Date().toISOString().split('T')[0]);
  const [rideDuration, setRideDuration] = useState('');
  const [rideConditions, setRideConditions] = useState('');
  const [rideNotes, setRideNotes] = useState('');
  const [section, setSection] = useState<'details' | 'notes' | 'waypoints' | 'log'>('details');

  const update = (partial: Partial<TrailRoute>) => {
    onUpdate({ ...route, ...partial, updatedAt: new Date().toISOString() });
  };

  const saveName = () => {
    if (nameVal.trim()) update({ name: nameVal.trim() });
    setEditingName(false);
  };

  const saveDesc = () => {
    update({ description: descVal.trim() });
    setEditingDesc(false);
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !route.tags.includes(tag)) {
      update({ tags: [...route.tags, tag] });
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => update({ tags: route.tags.filter(t => t !== tag) });

  const logRide = () => {
    const entry: RideLogEntry = {
      id: crypto.randomUUID(),
      date: rideDate,
      duration: rideDuration,
      conditions: rideConditions,
      notes: rideNotes,
    };
    update({ rideLog: [...route.rideLog, entry] });
    setShowRideForm(false);
    setRideDuration(''); setRideConditions(''); setRideNotes('');
    setRideDate(new Date().toISOString().split('T')[0]);
  };

  const deleteRide = (id: string) => update({ rideLog: route.rideLog.filter(e => e.id !== id) });

  const TABS = [
    { key: 'details', label: 'Details' },
    { key: 'notes', label: `Notes (${route.annotations.length})` },
    { key: 'waypoints', label: `Waypoints (${route.waypoints.length})` },
    { key: 'log', label: `Rides (${route.rideLog.length})` },
  ] as const;

  return (
    <div className="w-72 min-w-[288px] bg-slate-900 border-l border-slate-700 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex gap-1">
              <input
                autoFocus
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                className="flex-1 bg-slate-700 text-white text-sm px-2 py-1 rounded border border-trail-500 outline-none"
              />
              <button onClick={saveName} className="text-trail-400 hover:text-trail-300"><Check size={16} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setEditingName(true)}>
              <h2 className="text-sm font-bold text-white truncate">{route.name}</h2>
              <Edit3 size={12} className="text-slate-500 opacity-0 group-hover:opacity-100 shrink-0" />
            </div>
          )}
          <p className="text-xs text-slate-500 mt-0.5">{route.pdfName}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSection(tab.key)}
            className={`flex-1 text-xs py-2 px-1 transition-colors ${
              section === tab.key
                ? 'text-trail-400 border-b-2 border-trail-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* DETAILS TAB */}
        {section === 'details' && (
          <div className="p-4 space-y-4">
            {/* Description */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Description</label>
              {editingDesc ? (
                <div className="space-y-1">
                  <textarea
                    autoFocus
                    value={descVal}
                    onChange={e => setDescVal(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-700 text-white text-xs px-2 py-1.5 rounded border border-trail-500 outline-none resize-none"
                  />
                  <div className="flex gap-1">
                    <button onClick={saveDesc} className="text-xs bg-trail-600 text-white px-2 py-1 rounded">Save</button>
                    <button onClick={() => setEditingDesc(false)} className="text-xs text-slate-400 px-2 py-1 rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => { setEditingDesc(true); setDescVal(route.description); }}
                  className="text-xs text-slate-300 cursor-pointer hover:text-white min-h-[32px]"
                >
                  {route.description || <span className="text-slate-600 italic">Click to add description…</span>}
                </p>
              )}
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Difficulty</label>
              <div className="flex gap-1 flex-wrap">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    onClick={() => update({ difficulty: d })}
                    className={`text-xs px-2 py-0.5 rounded border capitalize transition-colors ${
                      route.difficulty === d ? DIFF_COLOR[d] : 'text-slate-600 border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Terrain */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Terrain</label>
              <div className="flex gap-1 flex-wrap">
                {TERRAINS.map(t => (
                  <button
                    key={t}
                    onClick={() => update({ terrainType: t })}
                    className={`text-xs px-2 py-0.5 rounded border capitalize transition-colors ${
                      route.terrainType === t
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'text-slate-600 border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Distance + Elevation */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                  <Route size={10} /> Distance (mi)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={route.distanceMiles ?? ''}
                  onChange={e => update({ distanceMiles: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0.0"
                  className="w-full bg-slate-800 text-white text-xs px-2 py-1.5 rounded border border-slate-600 focus:border-trail-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                  <Mountain size={10} /> Elevation (ft)
                </label>
                <input
                  type="number"
                  min={0}
                  value={route.elevationFt ?? ''}
                  onChange={e => update({ elevationFt: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0"
                  className="w-full bg-slate-800 text-white text-xs px-2 py-1.5 rounded border border-slate-600 focus:border-trail-500 outline-none"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><Tag size={10} /> Tags</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {route.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="text-slate-500 hover:text-red-400"><X size={10} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTag(); }}
                  placeholder="Add tag…"
                  className="flex-1 bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-600 focus:border-trail-500 outline-none"
                />
                <button onClick={addTag} className="bg-slate-700 hover:bg-slate-600 text-white px-2 rounded">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Meta */}
            <div className="text-xs text-slate-600 space-y-0.5 pt-2 border-t border-slate-800">
              <p>Added {new Date(route.createdAt).toLocaleDateString()}</p>
              <p>Updated {new Date(route.updatedAt).toLocaleDateString()}</p>
              <p>{route.pdfPages} page{route.pdfPages !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}

        {/* NOTES TAB */}
        {section === 'notes' && (
          <div className="p-3 space-y-2">
            {route.annotations.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notes yet.</p>
                <p className="text-xs mt-1">Use the note tool on the map to add notes.</p>
              </div>
            ) : (
              route.annotations.map(ann => (
                <div key={ann.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <div style={{ background: ann.color }} className="w-3 h-3 rounded-full mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-200 flex-1">{ann.text}</p>
                    </div>
                    <button
                      onClick={() => onDeleteAnnotation(ann.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 ml-5">
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* WAYPOINTS TAB */}
        {section === 'waypoints' && (
          <div className="p-3 space-y-2">
            {route.waypoints.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MapPin size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No waypoints yet.</p>
                <p className="text-xs mt-1">Use the waypoint tool on the map.</p>
              </div>
            ) : (
              route.waypoints.map(wp => (
                <div key={wp.id} className="flex items-center gap-2 bg-slate-800 rounded-lg p-2 border border-slate-700 group">
                  <WaypointIcon type={wp.type} size={24} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 capitalize">{wp.type}</p>
                  </div>
                  <button
                    onClick={() => onDeleteWaypoint(wp.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* RIDE LOG TAB */}
        {section === 'log' && (
          <div className="p-3 space-y-3">
            <button
              onClick={() => setShowRideForm(f => !f)}
              className="w-full flex items-center justify-center gap-2 bg-trail-600 hover:bg-trail-500 text-white text-sm py-2 rounded-lg"
            >
              <Plus size={15} />
              Log a Ride
            </button>

            {showRideForm && (
              <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 space-y-2">
                <div>
                  <label className="text-xs text-slate-500">Date</label>
                  <input
                    type="date"
                    value={rideDate}
                    onChange={e => setRideDate(e.target.value)}
                    className="w-full bg-slate-700 text-white text-xs px-2 py-1.5 rounded border border-slate-600 outline-none mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Duration</label>
                  <input
                    value={rideDuration}
                    onChange={e => setRideDuration(e.target.value)}
                    placeholder="e.g. 2h 30m"
                    className="w-full bg-slate-700 text-white text-xs px-2 py-1.5 rounded border border-slate-600 outline-none mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Conditions</label>
                  <input
                    value={rideConditions}
                    onChange={e => setRideConditions(e.target.value)}
                    placeholder="e.g. Sunny, dry trails"
                    className="w-full bg-slate-700 text-white text-xs px-2 py-1.5 rounded border border-slate-600 outline-none mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Notes</label>
                  <textarea
                    value={rideNotes}
                    onChange={e => setRideNotes(e.target.value)}
                    rows={2}
                    placeholder="How was the ride?"
                    className="w-full bg-slate-700 text-white text-xs px-2 py-1.5 rounded border border-slate-600 outline-none resize-none mt-0.5"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={logRide} className="flex-1 bg-trail-600 hover:bg-trail-500 text-white text-xs py-1.5 rounded">Save</button>
                  <button onClick={() => setShowRideForm(false)} className="text-xs text-slate-400 px-3 py-1.5 rounded hover:text-white">Cancel</button>
                </div>
              </div>
            )}

            {route.rideLog.length === 0 && !showRideForm ? (
              <div className="text-center py-6 text-slate-500">
                <Calendar size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No rides logged yet.</p>
              </div>
            ) : (
              [...route.rideLog].reverse().map(entry => (
                <div key={entry.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700 group">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Calendar size={11} className="text-trail-400" />
                        {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {entry.duration && (
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <Clock size={10} />
                          {entry.duration}
                        </p>
                      )}
                      {entry.conditions && (
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <Cloud size={10} />
                          {entry.conditions}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteRide(entry.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {entry.notes && <p className="text-xs text-slate-400 mt-1.5 italic">{entry.notes}</p>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
