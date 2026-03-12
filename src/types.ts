export type Difficulty = 'easy' | 'moderate' | 'hard' | 'expert';
export type TerrainType = 'trail' | 'road' | 'mixed' | 'gravel';
export type WaypointType = 'parking' | 'water' | 'restroom' | 'viewpoint' | 'caution' | 'custom';

export interface Annotation {
  id: string;
  x: number;       // relative 0–1 on the PDF canvas
  y: number;
  page: number;
  text: string;
  color: string;
  createdAt: string;
}

export interface Waypoint {
  id: string;
  x: number;
  y: number;
  page: number;
  type: WaypointType;
  label: string;
}

export interface RideLogEntry {
  id: string;
  date: string;
  conditions: string;
  duration: string;   // e.g. "2h 15m"
  notes: string;
}

export interface Route {
  id: string;
  name: string;
  description: string;
  pdfName: string;
  pdfData: string;        // base64
  pdfPages: number;
  difficulty: Difficulty;
  terrainType: TerrainType;
  distanceMiles: number | null;
  elevationFt: number | null;
  tags: string[];
  isFavorite: boolean;
  annotations: Annotation[];
  waypoints: Waypoint[];
  rideLog: RideLogEntry[];
  createdAt: string;
  updatedAt: string;
  thumbnailData?: string;  // base64 of first page thumbnail
}

export type DrawingColor = '#ef4444' | '#3b82f6' | '#f59e0b' | '#22c55e' | '#a855f7';

export interface DrawingStroke {
  id: string;
  page: number;
  points: { x: number; y: number }[];
  color: DrawingColor;
  width: number;
}
