import { useState } from 'react';
import {
  Search, Star, StarOff, Trash2, ChevronDown, ChevronUp,
  Mountain, Route, Gauge, Tag, X, Upload, Bike
} from 'lucide-react';
import type { Route as TrailRoute, Difficulty, TerrainType } from '../types';

interface Props {
  routes: TrailRoute[];
  activeRouteId: string | null;
  onSelectRoute: (id: string) => void;
  onDeleteRoute: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateRoute: (route: TrailRoute) => void;
  onUploadClick: () => void;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'moderate', 'hard', 'expert'];
const TERRAINS: TerrainType[] = ['trail', 'road', 'mixed', 'gravel'];

const DIFF_COLOR: Record<Difficulty, string> = {
  easy:     'text-green-400 bg-green-500/10 border-green-500/30',
  moderate: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  hard:     'text-orange-400 bg-orange-500/10 border-orange-500/30',
  expert:   'text-red-400 bg-red-500/10 border-red-500/30',
};

const TERRAIN_COLOR: Record<TerrainType, string> = {
  trail:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  road:   'text-blue-400 bg-blue-500/10 border-blue-500/30',
  mixed:  'text-purple-400 bg-purple-500/10 border-purple-500/30',
  gravel: 'text-stone-400 bg-stone-500/10 border-stone-500/30',
};

export function Sidebar({ routes, activeRouteId, onSelectRoute, onDeleteRoute, onToggleFavorite, onUploadClick }: Props) {
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState<Difficulty | null>(null);
  const [filterTerrain, setFilterTerrain] = useState<TerrainType | null>(null);
  const [filterFav, setFilterFav] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = routes.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) &&
        !r.description.toLowerCase().includes(search.toLowerCase()) &&
        !r.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false;
    if (filterDiff && r.difficulty !== filterDiff) return false;
    if (filterTerrain && r.terrainType !== filterTerrain) return false;
    if (filterFav && !r.isFavorite) return false;
    return true;
  });

  return (
    <div className="w-64 min-w-[256px] bg-slate-900 border-r border-slate-700 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Bike className="text-trail-400" size={20} />
          <h1 className="text-base font-bold text-white">TrailMap</h1>
        </div>
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-2 bg-trail-600 hover:bg-trail-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          <Upload size={15} />
          Upload PDF Map
        </button>
      </div>

      {/* Search + filters */}
      <div className="px-3 py-2 border-b border-slate-700 space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search routes..."
            className="w-full bg-slate-800 text-sm text-white pl-8 pr-3 py-1.5 rounded border border-slate-600 focus:border-trail-500 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
          >
            <Tag size={12} />
            Filters
            {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button
            onClick={() => setFilterFav(f => !f)}
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors ${
              filterFav ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'text-slate-500 border-slate-600 hover:text-amber-400'
            }`}
          >
            <Star size={11} />
            Favorites
          </button>
        </div>

        {showFilters && (
          <div className="space-y-2">
            {/* Difficulty */}
            <div>
              <p className="text-xs text-slate-500 mb-1">Difficulty</p>
              <div className="flex flex-wrap gap-1">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    onClick={() => setFilterDiff(filterDiff === d ? null : d)}
                    className={`text-xs px-2 py-0.5 rounded border capitalize transition-colors ${
                      filterDiff === d ? DIFF_COLOR[d] : 'text-slate-500 border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            {/* Terrain */}
            <div>
              <p className="text-xs text-slate-500 mb-1">Terrain</p>
              <div className="flex flex-wrap gap-1">
                {TERRAINS.map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterTerrain(filterTerrain === t ? null : t)}
                    className={`text-xs px-2 py-0.5 rounded border capitalize transition-colors ${
                      filterTerrain === t ? TERRAIN_COLOR[t] : 'text-slate-500 border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Route count */}
      <div className="px-3 py-1.5 text-xs text-slate-500 border-b border-slate-700">
        {filtered.length} route{filtered.length !== 1 ? 's' : ''}
        {(filterDiff || filterTerrain || filterFav || search) ? ' (filtered)' : ''}
      </div>

      {/* Route list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            {routes.length === 0 ? (
              <>
                <Bike size={32} className="mx-auto mb-2 opacity-30" />
                <p>No routes yet.</p>
                <p className="text-xs mt-1">Upload a PDF to get started!</p>
              </>
            ) : 'No routes match your filters.'}
          </div>
        ) : (
          filtered.map(route => (
            <RouteCard
              key={route.id}
              route={route}
              active={activeRouteId === route.id}
              onSelect={() => onSelectRoute(route.id)}
              onDelete={() => onDeleteRoute(route.id)}
              onToggleFavorite={() => onToggleFavorite(route.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function RouteCard({
  route, active, onSelect, onDelete, onToggleFavorite,
}: {
  route: TrailRoute;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      onClick={onSelect}
      className={`px-3 py-2.5 border-b border-slate-800 cursor-pointer transition-colors group ${
        active ? 'bg-slate-700/60 border-l-2 border-l-trail-500' : 'hover:bg-slate-800/60'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-sm font-medium text-white leading-tight flex-1 truncate">{route.name}</p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
            className={`p-0.5 rounded ${route.isFavorite ? 'text-amber-400' : 'text-slate-500 hover:text-amber-400'}`}
          >
            {route.isFavorite ? <Star size={13} fill="currentColor" /> : <StarOff size={13} />}
          </button>
          {!confirmDelete ? (
            <button
              onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
              className="p-0.5 rounded text-slate-500 hover:text-red-400"
            >
              <Trash2 size={13} />
            </button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-0.5 rounded text-red-400 text-xs font-bold"
              onBlur={() => setConfirmDelete(false)}
              autoFocus
            >
              ✓
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <span className={`text-xs px-1.5 py-0.5 rounded border capitalize ${DIFF_COLOR[route.difficulty]}`}>
          {route.difficulty}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded border capitalize ${TERRAIN_COLOR[route.terrainType]}`}>
          {route.terrainType}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-1.5 text-slate-500">
        {route.distanceMiles != null && (
          <span className="flex items-center gap-0.5 text-xs">
            <Route size={10} />
            {route.distanceMiles} mi
          </span>
        )}
        {route.elevationFt != null && (
          <span className="flex items-center gap-0.5 text-xs">
            <Mountain size={10} />
            {route.elevationFt} ft
          </span>
        )}
        {route.rideLog.length > 0 && (
          <span className="flex items-center gap-0.5 text-xs">
            <Gauge size={10} />
            {route.rideLog.length}x
          </span>
        )}
      </div>

      {route.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {route.tags.map(tag => (
            <span key={tag} className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
