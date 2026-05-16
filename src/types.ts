export interface RouteStats {
  dist: number;
  ascent: number;
  descent: number;
}

export interface Segment {
  coords: [number, number, number | null][]; // [lat, lng, ele]
  dist: number;
  ascent: number;
  descent: number;
}

export interface SavedRoute {
  id: string;
  name: string;
  created: string;
  waypoints: [number, number][]; // [lng, lat]
  coords: [number, number, number | null][]; // [lat, lng, ele]
  stats: RouteStats;
}

export interface RouteMetadata {
  id: string;
  name: string;
  created: string;
}

export interface Store {
  list(): Promise<RouteMetadata[]>;
  get(id: string): Promise<SavedRoute | null>;
  save(payload: SavedRoute): Promise<string>;
  delete(id: string): Promise<void>;
  clear?(): Promise<void>;
}
