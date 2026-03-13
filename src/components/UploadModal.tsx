import { useRef, useState, useCallback } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Route, Difficulty, TerrainType } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

interface Props {
  onClose: () => void;
  onSave: (route: Route) => void;
}

export function UploadModal({ onClose, onSave }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfData, setPdfData] = useState('');
  const [pdfPages, setPdfPages] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
  const [terrain, setTerrain] = useState<TerrainType>('trail');
  const [distance, setDistance] = useState('');
  const [elevation, setElevation] = useState('');
  const [loading, setLoading] = useState(false);

  const processPdf = useCallback(async (file: File) => {
    setLoading(true);
    setPdfFile(file);
    if (!name) setName(file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPdfData(dataUrl);

      // Get page count
      const base64 = dataUrl.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      try {
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
        setPdfPages(doc.numPages);
      } catch {
        setPdfPages(1);
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }, [name]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') processPdf(file);
  }, [processPdf]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processPdf(file);
  };

  const handleSave = () => {
    if (!pdfData || !name.trim()) return;
    const route: Route = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      pdfName: pdfFile?.name ?? 'map.pdf',
      pdfData,
      pdfPages,
      difficulty,
      terrainType: terrain,
      distanceMiles: distance ? Number(distance) : null,
      elevationFt: elevation ? Number(elevation) : null,
      tags: [],
      isFavorite: false,
      annotations: [],
      waypoints: [],
      rideLog: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(route);
  };

  const DIFF: { value: Difficulty; label: string; color: string }[] = [
    { value: 'easy',     label: 'Easy',     color: 'text-green-400 bg-green-500/10 border-green-500/40' },
    { value: 'moderate', label: 'Moderate', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/40' },
    { value: 'hard',     label: 'Hard',     color: 'text-orange-400 bg-orange-500/10 border-orange-500/40' },
    { value: 'expert',   label: 'Expert',   color: 'text-red-400 bg-red-500/10 border-red-500/40' },
  ];

  const TERR: { value: TerrainType; label: string }[] = [
    { value: 'trail',  label: 'Trail' },
    { value: 'road',   label: 'Road' },
    { value: 'mixed',  label: 'Mixed' },
    { value: 'gravel', label: 'Gravel' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-base font-bold text-white">Add Bike Map</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {/* Drop zone */}
          {!pdfFile ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragging ? 'border-trail-500 bg-trail-500/10' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'
              }`}
            >
              <Upload size={32} className="mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-300 font-medium">Drop your PDF map here</p>
              <p className="text-xs text-slate-500 mt-1">or click to browse</p>
              <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg px-3 py-2 border border-slate-600">
              <FileText size={20} className="text-trail-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{pdfFile.name}</p>
                <p className="text-xs text-slate-500">{pdfPages} page{pdfPages !== 1 ? 's' : ''} · {(pdfFile.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={() => { setPdfFile(null); setPdfData(''); }} className="text-slate-500 hover:text-red-400">
                <X size={16} />
              </button>
            </div>
          )}

          {loading && <p className="text-xs text-slate-400 text-center animate-pulse">Reading PDF…</p>}

          {/* Name */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Route Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Riverside Connector Loop"
              className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded border border-slate-600 focus:border-trail-500 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="What's special about this route?"
              className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded border border-slate-600 focus:border-trail-500 outline-none resize-none"
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Difficulty</label>
            <div className="flex gap-2">
              {DIFF.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                    difficulty === d.value ? d.color : 'text-slate-500 border-slate-600 hover:text-slate-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Terrain */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Terrain Type</label>
            <div className="flex gap-2">
              {TERR.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTerrain(t.value)}
                  className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                    terrain === t.value
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'text-slate-500 border-slate-600 hover:text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Distance + Elevation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Distance (miles)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={distance}
                onChange={e => setDistance(e.target.value)}
                placeholder="Optional"
                className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded border border-slate-600 focus:border-trail-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Elevation Gain (ft)</label>
              <input
                type="number"
                min={0}
                value={elevation}
                onChange={e => setElevation(e.target.value)}
                placeholder="Optional"
                className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded border border-slate-600 focus:border-trail-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-700 flex gap-3">
          <button onClick={onClose} className="flex-1 text-sm text-slate-400 py-2 rounded border border-slate-600 hover:text-white hover:border-slate-500">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!pdfData || !name.trim() || loading}
            className="flex-1 text-sm bg-trail-600 hover:bg-trail-500 text-white py-2 rounded font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save Route
          </button>
        </div>
      </div>
    </div>
  );
}
