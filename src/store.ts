import type { Route, Annotation, Waypoint, RideLogEntry, DrawingStroke } from './types';

const STORAGE_KEY = 'trailmap_routes';
const DRAWINGS_KEY = 'trailmap_drawings';

export function loadRoutes(): Route[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRoutes(routes: Route[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routes));
}

export function loadDrawings(routeId: string): DrawingStroke[] {
  try {
    const raw = localStorage.getItem(`${DRAWINGS_KEY}_${routeId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDrawings(routeId: string, strokes: DrawingStroke[]): void {
  localStorage.setItem(`${DRAWINGS_KEY}_${routeId}`, JSON.stringify(strokes));
}

export function addRoute(route: Route): void {
  const routes = loadRoutes();
  routes.unshift(route);
  saveRoutes(routes);
}

export function updateRoute(updated: Route): void {
  const routes = loadRoutes();
  const idx = routes.findIndex(r => r.id === updated.id);
  if (idx !== -1) {
    routes[idx] = updated;
    saveRoutes(routes);
  }
}

export function deleteRoute(id: string): void {
  const routes = loadRoutes().filter(r => r.id !== id);
  saveRoutes(routes);
  localStorage.removeItem(`${DRAWINGS_KEY}_${id}`);
}

export function addAnnotation(routeId: string, ann: Annotation): void {
  const routes = loadRoutes();
  const route = routes.find(r => r.id === routeId);
  if (route) {
    route.annotations.push(ann);
    route.updatedAt = new Date().toISOString();
    saveRoutes(routes);
  }
}

export function deleteAnnotation(routeId: string, annId: string): void {
  const routes = loadRoutes();
  const route = routes.find(r => r.id === routeId);
  if (route) {
    route.annotations = route.annotations.filter(a => a.id !== annId);
    route.updatedAt = new Date().toISOString();
    saveRoutes(routes);
  }
}

export function addWaypoint(routeId: string, wp: Waypoint): void {
  const routes = loadRoutes();
  const route = routes.find(r => r.id === routeId);
  if (route) {
    route.waypoints.push(wp);
    route.updatedAt = new Date().toISOString();
    saveRoutes(routes);
  }
}

export function deleteWaypoint(routeId: string, wpId: string): void {
  const routes = loadRoutes();
  const route = routes.find(r => r.id === routeId);
  if (route) {
    route.waypoints = route.waypoints.filter(w => w.id !== wpId);
    route.updatedAt = new Date().toISOString();
    saveRoutes(routes);
  }
}

export function addRideLog(routeId: string, entry: RideLogEntry): void {
  const routes = loadRoutes();
  const route = routes.find(r => r.id === routeId);
  if (route) {
    route.rideLog.push(entry);
    route.updatedAt = new Date().toISOString();
    saveRoutes(routes);
  }
}

export function deleteRideLog(routeId: string, entryId: string): void {
  const routes = loadRoutes();
  const route = routes.find(r => r.id === routeId);
  if (route) {
    route.rideLog = route.rideLog.filter(e => e.id !== entryId);
    route.updatedAt = new Date().toISOString();
    saveRoutes(routes);
  }
}
