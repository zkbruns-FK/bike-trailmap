export type Difficulty = 'easy' | 'moderate' | 'hard' | 'expert';
export type TerrainType = 'trail' | 'road' | 'mixed' | 'gravel';
export type WaypointType = 'parking' | 'water' | 'restroom' | 'viewpoint' | 'caution' | 'custom';

export interface Annotation {
  id: string;
  lat: number;
  lng: number;
  text: string;
  color: string;
  createdAt: string;
}

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  type: WaypointType;
  label: string;
}

export interface RideLogEntry {
  id: string;
  date: string;
  conditions: string;
  duration: string;
  notes: string;
}

export interface Route {
  id: string;
  name: string;
  description: string;
  pdfName: string;
  pdfData: string;       // base64 full PDF
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
  // Where the PDF sits on the real map: [[southLat, westLng], [northLat, eastLng]]
  bounds?: [[number, number], [number, number]];
}

export type DrawingColor = '#ef4444' | '#3b82f6' | '#f59e0b' | '#22c55e' | '#a855f7';

export interface DrawingStroke {
  id: string;
  points: { lat: number; lng: number }[];
  color: DrawingColor;
  width: number;
}
