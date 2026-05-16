import { useState } from 'react';
import L from 'leaflet';
import { toast } from 'sonner';
import { MapCanvas } from '../components/MapCanvas';
import { Button } from '../components/ui/button';
import { routeBetween } from '../lib/brouter';
import { calculateStats, formatDistance } from '../lib/stats';
import { useStore } from '../hooks/useStore';
import { Segment, SavedRoute } from '../types';

export function MapPage() {
  const [mode, setMode] = useState<'normal' | 'draw'>('normal');
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [drawing, setDrawing] = useState(false);

  const store = useStore();

  const stats = calculateStats(segments);

  const handleMapClick = async (latlng: L.LatLng) => {
    if (mode !== 'draw' || drawing) return;

    const lngLat: [number, number] = [latlng.lng, latlng.lat];

    // First waypoint
    if (waypoints.length === 0) {
      setWaypoints([lngLat]);
      return;
    }

    // Route from last waypoint
    setDrawing(true);
    try {
      const prev = waypoints[waypoints.length - 1];
      if (!prev) return;

      const seg = await routeBetween(prev, lngLat);
      setSegments((s) => [...s, seg]);
      setWaypoints((w) => [...w, lngLat]);
      toast.success('Point added');
    } catch (e) {
      toast.error(`Routing failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setDrawing(false);
    }
  };

  const handleUndo = () => {
    if (waypoints.length === 0) return;

    setWaypoints((w) => w.slice(0, -1));
    setSegments((s) => s.slice(0, -1));
  };

  const handleClear = () => {
    if (!confirm('Clear current path?')) return;
    setWaypoints([]);
    setSegments([]);
  };

  const handleSave = async () => {
    const name = prompt('Name this route:', `Hike ${new Date().toLocaleDateString()}`);
    if (!name) return;

    // Merge all segment coordinates
    const allCoords: [number, number, number | null][] = [];
    segments.forEach((seg, i) => {
      seg.coords.forEach((c, j) => {
        if (i === 0 || j > 0) {
          allCoords.push(c);
        }
      });
    });

    const payload: SavedRoute = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim(),
      created: new Date().toISOString(),
      waypoints,
      coords: allCoords,
      stats,
    };

    try {
      await store.save(payload);
      toast.success(`Saved: ${name}`);
      setWaypoints([]);
      setSegments([]);
      setMode('normal');
    } catch (e) {
      toast.error(`Failed to save: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleToggleMode = () => {
    if (mode === 'normal') {
      setMode('draw');
      toast.info('Path mode: tap to add points');
    } else {
      if (segments.length > 0 && !confirm('Exit without saving current path?')) return;
      setWaypoints([]);
      setSegments([]);
      setMode('normal');
    }
  };

  const statsText = () => {
    if (waypoints.length === 0) {
      return 'Tap the map to start drawing.';
    }
    if (segments.length === 0) {
      return '1 point · tap again to route along paths.';
    }
    return `${formatDistance(stats.dist)} · ↑ ${Math.round(stats.ascent)} m · ↓ ${Math.round(stats.descent)} m · ${waypoints.length} pts`;
  };

  return (
    <>
      <MapCanvas
        center={[50.7826, 7.6566]}
        zoom={14}
        onMapClick={mode === 'draw' ? handleMapClick : undefined}
        waypoints={waypoints}
        segments={segments}
        savedRoute={null}
      />

      {/* Bottom-left controls */}
      <div className="absolute bottom-3 left-3 z-[1000] flex max-w-[calc(100vw-24px)] flex-col gap-2">
        {/* Draw panel */}
        {mode === 'draw' && (
          <div className="rounded-lg border bg-card p-3 shadow-lg">
            <div className="mb-3 text-sm">{drawing ? 'Routing…' : statsText()}</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={waypoints.length === 0}
              >
                ↶ Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={waypoints.length === 0}
              >
                Clear
              </Button>
              <Button size="sm" onClick={handleSave} disabled={segments.length === 0}>
                Save
              </Button>
            </div>
          </div>
        )}

        {/* FAB */}
        <button
          onClick={handleToggleMode}
          className={`flex h-[52px] w-[52px] items-center justify-center rounded-full border text-3xl shadow-lg transition-colors ${
            mode === 'draw'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-card-foreground hover:bg-accent'
          }`}
          title={mode === 'draw' ? 'Exit draw mode' : 'Draw path'}
        >
          {mode === 'draw' ? '×' : '+'}
        </button>
      </div>
    </>
  );
}
