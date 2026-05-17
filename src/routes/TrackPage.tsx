import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { MapCanvas } from '../components/MapCanvas';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useTracker } from '../hooks/useTracker';
import { useStore } from '../hooks/useStore';
import { formatDistance } from '../lib/stats';
import { formatDuration } from '../lib/geo';
import { SavedRoute } from '../types';

export function TrackPage() {
  const {
    status,
    points,
    snappedCoordinates,
    currentSpeed,
    currentAccuracy,
    elapsedTime,
    start,
    pause,
    resume,
    stop,
    discard,
    snapToPaths,
    getStats,
    hasInProgressTrack,
  } = useTracker();

  const [showRaw, setShowRaw] = useState(true);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [location, navigate] = useLocation();
  const store = useStore();

  const stats = getStats();

  // Check for autostart query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && status === 'idle' && !hasInProgressTrack) {
      // Start tracking immediately
      start();
      // Clean up the URL
      window.history.replaceState({}, '', location.split('?')[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Check for in-progress track on mount
  useEffect(() => {
    if (hasInProgressTrack && status !== 'idle') {
      const savedTrackKey = localStorage.getItem('track_in_progress_v1');
      if (savedTrackKey) {
        try {
          const parsed = JSON.parse(savedTrackKey);
          if (parsed.startedAt) {
            setShowResumeBanner(true);
          }
        } catch {
          // Ignore
        }
      }
    }
  }, [hasInProgressTrack, status]);

  const handleResumeSaved = () => {
    setShowResumeBanner(false);
    if (status === 'paused') {
      resume();
    }
  };

  const handleDiscardSaved = () => {
    setShowResumeBanner(false);
    discard();
  };

  const handleStart = () => {
    start();
  };

  const handlePause = () => {
    pause();
  };

  const handleResume = () => {
    resume();
  };

  const handleStop = () => {
    stop();
  };

  const handleDiscard = () => {
    if (!confirm('Discard this track? This cannot be undone.')) return;
    discard();
  };

  const handleSave = async () => {
    const now = new Date();
    const defaultName = `Hike ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const name = prompt('Name this track:', defaultName);

    if (!name) return;

    // Convert points to SavedRoute format
    const coords: [number, number, number | null][] = points.map((p) => [p.lat, p.lng, p.ele]);

    const payload: SavedRoute = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim(),
      created: new Date().toISOString(),
      kind: 'tracked',
      waypoints: [], // No waypoints for tracked routes
      coords,
      snappedCoordinates: snappedCoordinates ?? undefined,
      stats: {
        dist: stats.distance,
        ascent: stats.ascent,
        descent: stats.descent,
      },
    };

    try {
      await store.save(payload);
      toast.success(`Saved: ${name}`);
      discard(); // Clear the track
      navigate('/routes');
    } catch (e) {
      toast.error(`Failed to save: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleSnapToPaths = async () => {
    await snapToPaths();
  };

  // Prepare data for MapCanvas
  const routeCoords =
    showRaw || !snappedCoordinates
      ? points.map((p) => [p.lat, p.lng] as [number, number])
      : snappedCoordinates.map((c) => [c[1], c[0]] as [number, number]); // Convert [lng, lat] to [lat, lng]

  // Map center: use last point or default
  const mapCenter: [number, number] =
    points.length > 0
      ? [points[points.length - 1]?.lat ?? 50.7826, points[points.length - 1]?.lng ?? 7.6566]
      : [50.7826, 7.6566];

  return (
    <>
      <MapCanvas
        center={mapCenter}
        zoom={14}
        waypoints={[]}
        segments={
          routeCoords.length > 0
            ? [
                {
                  coords: routeCoords.map((c) => [c[0], c[1], null] as [number, number, null]),
                },
              ]
            : []
        }
        savedRoute={null}
        trackingMode={true}
        trackSegments={points.map((p) => ({ point: p }))}
      />

      {/* Resume banner */}
      {showResumeBanner && (
        <div className="absolute top-20 left-3 right-3 z-[1000]">
          <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
            <CardContent className="p-4">
              <div className="mb-3 font-medium">Resume tracked hike?</div>
              <div className="mb-3 text-sm text-muted-foreground">
                You have an in-progress track from{' '}
                {stats.pointCount > 0 ? `${formatDistance(stats.distance)} ago` : 'earlier'}.
              </div>
              <div className="flex gap-2">
                <Button onClick={handleResumeSaved} className="flex-1" size="sm">
                  Resume
                </Button>
                <Button onClick={handleDiscardSaved} variant="destructive" size="sm">
                  Discard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recording indicator (bottom-right) */}
      {status === 'recording' && (
        <div className="absolute bottom-4 right-4 z-[1000] flex items-center gap-2 rounded-full border border-red-500 bg-card px-4 py-2 shadow-lg">
          <div className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
          <span className="text-sm font-medium text-red-500">Recording</span>
        </div>
      )}

      {/* Bottom panel */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000]">
        <Card>
          <CardContent className="p-4">
            {/* Stats */}
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-muted-foreground">Duration</div>
                <div className="font-mono font-semibold">{formatDuration(elapsedTime)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Distance</div>
                <div className="font-mono font-semibold">{formatDistance(stats.distance)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Ascent</div>
                <div className="font-mono font-semibold">{Math.round(stats.ascent)} m</div>
              </div>
              <div>
                <div className="text-muted-foreground">Speed</div>
                <div className="font-mono font-semibold">{currentSpeed.toFixed(1)} km/h</div>
              </div>
              <div>
                <div className="text-muted-foreground">GPS Accuracy</div>
                <div className="font-mono font-semibold">{Math.round(currentAccuracy)} m</div>
              </div>
              <div>
                <div className="text-muted-foreground">Points</div>
                <div className="font-mono font-semibold">{stats.pointCount}</div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2">
              {status === 'idle' && (
                <Button onClick={handleStart} className="flex-1" size="lg">
                  Start Tracking
                </Button>
              )}

              {status === 'recording' && (
                <>
                  <Button onClick={handlePause} variant="outline" className="flex-1" size="lg">
                    Pause
                  </Button>
                  <Button onClick={handleStop} variant="outline" size="lg">
                    Stop
                  </Button>
                </>
              )}

              {status === 'paused' && (
                <>
                  <Button onClick={handleResume} className="flex-1" size="lg">
                    Resume
                  </Button>
                  <Button onClick={handleStop} variant="outline" size="lg">
                    Stop
                  </Button>
                </>
              )}

              {status === 'stopped' && (
                <>
                  <Button
                    onClick={handleSnapToPaths}
                    variant="outline"
                    size="sm"
                    disabled={points.length < 2}
                  >
                    {snappedCoordinates ? '✓ Snapped' : 'Snap to Paths'}
                  </Button>
                  {snappedCoordinates && (
                    <Button onClick={() => setShowRaw(!showRaw)} variant="outline" size="sm">
                      {showRaw ? 'Show Snapped' : 'Show Raw'}
                    </Button>
                  )}
                  <Button onClick={handleSave} className="flex-1" size="sm">
                    Save
                  </Button>
                  <Button onClick={handleDiscard} variant="destructive" size="sm">
                    Discard
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
