import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import L from 'leaflet';
import { toast } from 'sonner';
import { MapCanvas } from '../components/MapCanvas';
import { NavDrawer } from '../components/NavDrawer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { routeBetween } from '../lib/brouter';
import { calculateStats, formatDistance } from '../lib/stats';
import { useStore } from '../hooks/useStore';
import { useTrackerContext } from '../contexts/TrackerContext';
import { Segment, SavedRoute } from '../types';

export function MapPage() {
  const [mode, setMode] = useState<'normal' | 'draw'>('normal');
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const store = useStore();
  const tracker = useTrackerContext();
  const [location, navigate] = useLocation();

  const stats = calculateStats(segments);

  // Parse `?focus=lat,lng&name=...` from the URL; null if absent/invalid.
  const focus = useMemo<{ lat: number; lng: number; name: string } | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const focusParam = params.get('focus');
    const nameParam = params.get('name');
    if (!focusParam || !nameParam) return null;
    const [latStr, lngStr] = focusParam.split(',');
    if (!latStr || !lngStr) return null;
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, name: nameParam };
    // `location` from wouter changes when the URL changes; recompute then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

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
      setWaypoints([]);
      setSegments([]);
      setMode('normal');
    } catch (e) {
      toast.error(`Failed to save: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleToggleMode = () => {
    // If tracking, open the drawer instead
    if (tracker.status === 'recording' || tracker.status === 'paused') {
      setDrawerOpen(true);
      return;
    }

    if (mode === 'normal') {
      setMode('draw');
    } else {
      if (segments.length > 0 && !confirm('Exit without saving current path?')) return;
      setWaypoints([]);
      setSegments([]);
      setMode('normal');
    }
  };

  const handleStopRequested = () => {
    tracker.stop();
    // Generate default name
    const now = new Date();
    const defaultName = `Hike ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setSaveName(defaultName);
    setSaveDialogOpen(true);
  };

  const handleSaveTrack = async () => {
    if (!saveName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    const coords: [number, number, number | null][] = tracker.points.map((p) => [
      p.lat,
      p.lng,
      p.ele,
    ]);

    const trackerStats = tracker.getStats();

    const payload: SavedRoute = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: saveName.trim(),
      created: new Date().toISOString(),
      kind: 'tracked',
      waypoints: [],
      coords,
      snappedCoordinates: tracker.snappedCoordinates ?? undefined,
      stats: {
        dist: trackerStats.distance,
        ascent: trackerStats.ascent,
        descent: trackerStats.descent,
      },
    };

    try {
      await store.save(payload);
      tracker.discard();
      setSaveDialogOpen(false);
      setSaveName('');
    } catch (e) {
      toast.error(`Failed to save: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleDiscardTrack = () => {
    if (!confirm("Discard this tracked hike? You can't undo this.")) return;
    tracker.discard();
    setSaveDialogOpen(false);
    setSaveName('');
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

  const isTracking = tracker.status === 'recording' || tracker.status === 'paused';

  // Prepare track data for MapCanvas
  const trackSegments = tracker.points.map((p) => ({ point: p }));

  return (
    <>
      <MapCanvas
        center={[50.7826, 7.6566]}
        zoom={14}
        onMapClick={mode === 'draw' ? handleMapClick : undefined}
        waypoints={waypoints}
        segments={segments}
        savedRoute={null}
        trackingMode={isTracking}
        trackSegments={trackSegments}
        {...(focus ? { focusMarker: { lat: focus.lat, lng: focus.lng, name: focus.name } } : {})}
      />

      {/* Top-center: "Back to results" pill (only in search preview mode) */}
      {focus && (
        <div className="absolute top-3 left-1/2 z-[1000] -translate-x-1/2">
          <button
            onClick={() => navigate('/search')}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-card-foreground shadow-lg"
          >
            <span aria-hidden="true">←</span>
            <span className="max-w-[60vw] truncate">{focus.name}</span>
          </button>
        </div>
      )}

      {/* Bottom-left: hamburger button */}
      <div className="absolute bottom-4 left-4 z-[1000]">
        <button
          onClick={() => setDrawerOpen(true)}
          className="relative z-[1001] flex h-[52px] w-[52px] items-center justify-center rounded-full border border-border bg-card text-card-foreground shadow-lg transition-colors hover:bg-accent"
          aria-label="Menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Draw mode panel (above hamburger) */}
      {mode === 'draw' && !isTracking && (
        <div className="absolute bottom-20 left-4 z-[1000] max-w-[calc(100vw-32px)]">
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
        </div>
      )}

      {/* Bottom-right: "+" FAB (context-aware) */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <button
          onClick={handleToggleMode}
          className={`relative flex h-[52px] w-[52px] items-center justify-center rounded-full border text-3xl shadow-lg transition-colors ${
            isTracking
              ? 'border-red-500 bg-card text-red-500'
              : mode === 'draw'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-card-foreground hover:bg-accent'
          }`}
          title={
            isTracking ? 'View tracking controls' : mode === 'draw' ? 'Exit draw mode' : 'Draw path'
          }
        >
          {/* Pulsing ring when recording */}
          {tracker.status === 'recording' && (
            <span className="absolute inset-0 animate-pulse rounded-full border-2 border-red-500 opacity-75" />
          )}
          {/* Icon */}
          {isTracking ? '●' : mode === 'draw' ? '×' : '+'}
        </button>
      </div>

      {/* Nav drawer */}
      <NavDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStopRequested={handleStopRequested}
      />

      {/* Save track dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save tracked hike</DialogTitle>
            <DialogDescription>Give your tracked hike a name to save it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="track-name">Name</Label>
              <Input
                id="track-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Hike name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveTrack();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleDiscardTrack} variant="destructive">
              Discard
            </Button>
            <Button onClick={handleSaveTrack}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
