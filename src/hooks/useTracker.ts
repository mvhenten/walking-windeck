import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { haversineDistance, calculateElevationChanges, calculateTotalDistance } from '../lib/geo';
import { routeBetween } from '../lib/brouter';

const TRACK_STORAGE_KEY = 'track_in_progress_v1';
const MAX_ACCURACY = 50; // meters
const MAX_SPEED = 10; // m/s (~36 km/h)
const GAP_TIME_THRESHOLD = 60; // seconds
const GAP_DISTANCE_THRESHOLD = 100; // meters
const PERSIST_THROTTLE = 2000; // ms

export type TrackStatus = 'idle' | 'recording' | 'paused' | 'stopped';
export type SegmentSource = 'gps' | 'gap-fill' | 'gap-straight';

export interface TrackPoint {
  lat: number;
  lng: number;
  ele: number | null;
  accuracy: number;
  timestamp: number;
  source: SegmentSource;
}

export interface TrackSegment {
  points: TrackPoint[];
  source: SegmentSource;
}

interface TrackState {
  status: TrackStatus;
  startedAt: number | null;
  lastFixAt: number | null;
  pausedAt: number | null;
  totalPausedTime: number;
  points: TrackPoint[];
  snappedCoordinates: [number, number][] | null;
}

export function useTracker() {
  const [state, setState] = useState<TrackState>({
    status: 'idle',
    startedAt: null,
    lastFixAt: null,
    pausedAt: null,
    totalPausedTime: 0,
    points: [],
    snappedCoordinates: null,
  });

  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentAccuracy, setCurrentAccuracy] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastPersistRef = useRef<number>(0);
  const lastPointRef = useRef<TrackPoint | null>(null);

  // Persist state to localStorage
  const persistState = useCallback((currentState: TrackState) => {
    const now = Date.now();
    if (now - lastPersistRef.current < PERSIST_THROTTLE) {
      return;
    }
    lastPersistRef.current = now;

    try {
      localStorage.setItem(TRACK_STORAGE_KEY, JSON.stringify(currentState));
    } catch (e) {
      console.error('Failed to persist track:', e);
    }
  }, []);

  // Load saved state on mount
  useEffect(() => {
    const saved = localStorage.getItem(TRACK_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: TrackState = JSON.parse(saved);
        if (parsed.status === 'recording' || parsed.status === 'paused') {
          // Show resume banner - handled by parent component
          setState(parsed);
          if (parsed.points.length > 0) {
            lastPointRef.current = parsed.points[parsed.points.length - 1] ?? null;
          }
        }
      } catch (e) {
        console.error('Failed to load saved track:', e);
      }
    }
  }, []);

  // Acquire wake lock
  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      toast.info('Wake lock not supported. Keep the app open during tracking.');
      return;
    }

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      console.log('Wake lock acquired');
    } catch (e) {
      console.error('Failed to acquire wake lock:', e);
    }
  }, []);

  // Release wake lock
  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      console.log('Wake lock released');
    }
  }, []);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && state.status === 'recording') {
        // Re-acquire wake lock
        await acquireWakeLock();

        // Force fresh fix to detect gap
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              handlePosition(pos, true);
            },
            (err) => {
              console.error('Failed to get position on visibility change:', err);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, acquireWakeLock]);

  // Handle GPS position
  const handlePosition = useCallback(
    async (position: GeolocationPosition, forceGapCheck = false) => {
      if (state.status !== 'recording') return;

      const { latitude, longitude, altitude, accuracy } = position.coords;
      const timestamp = position.timestamp;

      // Filter by accuracy
      if (accuracy > MAX_ACCURACY) {
        console.log(`Dropped fix: accuracy ${accuracy.toFixed(1)}m > ${MAX_ACCURACY}m`);
        setCurrentAccuracy(accuracy);
        return;
      }

      const newPoint: TrackPoint = {
        lat: latitude,
        lng: longitude,
        ele: altitude ?? null,
        accuracy,
        timestamp,
        source: 'gps',
      };

      // Check for implausible jump
      if (lastPointRef.current) {
        const dt = (timestamp - lastPointRef.current.timestamp) / 1000; // seconds
        const dx = haversineDistance(
          lastPointRef.current.lat,
          lastPointRef.current.lng,
          latitude,
          longitude
        );
        const speed = dt > 0 ? dx / dt : 0;

        if (speed > MAX_SPEED && !forceGapCheck) {
          console.log(`Dropped fix: speed ${speed.toFixed(1)} m/s > ${MAX_SPEED} m/s`);
          return;
        }

        // Update current speed
        setCurrentSpeed(speed * 3.6); // Convert to km/h

        // Check for gap
        if (forceGapCheck || dt > GAP_TIME_THRESHOLD || dx > GAP_DISTANCE_THRESHOLD) {
          console.log(`Gap detected: dt=${dt.toFixed(0)}s, dx=${dx.toFixed(0)}m`);
          await handleGapFill(lastPointRef.current, newPoint);
        }
      }

      // Accept the fix
      lastPointRef.current = newPoint;
      setCurrentAccuracy(accuracy);

      setState((prev) => {
        const updated = {
          ...prev,
          lastFixAt: timestamp,
          points: [...prev.points, newPoint],
        };
        persistState(updated);
        return updated;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.status, persistState]
  );

  // Handle gap fill
  const handleGapFill = useCallback(async (lastPoint: TrackPoint, newPoint: TrackPoint) => {
    try {
      // Try BRouter
      const segment = await routeBetween(
        [lastPoint.lng, lastPoint.lat],
        [newPoint.lng, newPoint.lat]
      );

      // Convert to TrackPoints
      const gapPoints: TrackPoint[] = segment.coords.map((c, i) => ({
        lat: c[0],
        lng: c[1],
        ele: c[2],
        accuracy: 0,
        timestamp:
          lastPoint.timestamp +
          ((newPoint.timestamp - lastPoint.timestamp) * i) / segment.coords.length,
        source: 'gap-fill' as SegmentSource,
      }));

      // Insert gap-fill points
      setState((prev) => ({
        ...prev,
        points: [...prev.points, ...gapPoints],
      }));

      console.log(`Gap filled with ${gapPoints.length} routed points`);
    } catch (e) {
      // Fallback to straight line
      console.warn('BRouter gap-fill failed, using straight line:', e);
      toast.error('Could not snap a gap — kept straight line');

      const straightPoint: TrackPoint = {
        lat: newPoint.lat,
        lng: newPoint.lng,
        ele: newPoint.ele,
        accuracy: newPoint.accuracy,
        timestamp: newPoint.timestamp,
        source: 'gap-straight',
      };

      setState((prev) => ({
        ...prev,
        points: [...prev.points, straightPoint],
      }));
    }
  }, []);

  // Handle GPS error
  const handleError = useCallback((error: GeolocationPositionError) => {
    if (error.code === error.PERMISSION_DENIED) {
      toast.error('Location permission denied. Please enable location in your browser settings.');
    } else if (error.code === error.TIMEOUT) {
      console.warn('GPS timeout');
    } else {
      toast.error(`GPS error: ${error.message}`);
    }
  }, []);

  // Update elapsed time
  useEffect(() => {
    if (state.status !== 'recording') return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = state.startedAt ? (now - state.startedAt - state.totalPausedTime) / 1000 : 0;
      setElapsedTime(elapsed);
    }, 100);

    return () => clearInterval(interval);
  }, [state.status, state.startedAt, state.totalPausedTime]);

  // Start tracking
  const start = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported by your browser');
      return;
    }

    const now = Date.now();
    setState({
      status: 'recording',
      startedAt: now,
      lastFixAt: null,
      pausedAt: null,
      totalPausedTime: 0,
      points: [],
      snappedCoordinates: null,
    });

    lastPointRef.current = null;
    setCurrentSpeed(0);
    setCurrentAccuracy(0);
    setElapsedTime(0);

    await acquireWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => handlePosition(pos),
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 30000,
      }
    );

    toast.success('Tracking started');
  }, [acquireWakeLock, handlePosition, handleError]);

  // Pause tracking
  const pause = useCallback(() => {
    if (state.status !== 'recording') return;

    const now = Date.now();
    setState((prev) => ({
      ...prev,
      status: 'paused',
      pausedAt: now,
    }));

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    releaseWakeLock();
    toast.info('Tracking paused');
  }, [state.status, releaseWakeLock]);

  // Resume tracking
  const resume = useCallback(async () => {
    if (state.status !== 'paused') return;

    const now = Date.now();
    const pauseDuration = state.pausedAt ? now - state.pausedAt : 0;

    setState((prev) => ({
      ...prev,
      status: 'recording',
      pausedAt: null,
      totalPausedTime: prev.totalPausedTime + pauseDuration,
    }));

    await acquireWakeLock();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => handlePosition(pos, true), // Force gap check on resume
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 30000,
      }
    );

    toast.success('Tracking resumed');
  }, [state.status, state.pausedAt, acquireWakeLock, handlePosition, handleError]);

  // Stop tracking
  const stop = useCallback(() => {
    if (state.status !== 'recording' && state.status !== 'paused') return;

    setState((prev) => ({
      ...prev,
      status: 'stopped',
    }));

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    releaseWakeLock();
    lastPointRef.current = null;
    toast.info('Tracking stopped');
  }, [state.status, releaseWakeLock]);

  // Discard track
  const discard = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    releaseWakeLock();
    setState({
      status: 'idle',
      startedAt: null,
      lastFixAt: null,
      pausedAt: null,
      totalPausedTime: 0,
      points: [],
      snappedCoordinates: null,
    });

    lastPointRef.current = null;
    setCurrentSpeed(0);
    setCurrentAccuracy(0);
    setElapsedTime(0);

    localStorage.removeItem(TRACK_STORAGE_KEY);
    toast.info('Track discarded');
  }, [releaseWakeLock]);

  // Snap to paths
  const snapToPaths = useCallback(async () => {
    if (state.points.length < 2) {
      toast.error('Not enough points to snap');
      return;
    }

    toast.info('Snapping to paths...');

    try {
      // Filter GPS points only for snapping
      const gpsPoints = state.points.filter((p) => p.source === 'gps');

      if (gpsPoints.length < 2) {
        toast.error('Not enough GPS points to snap');
        return;
      }

      // Chunk points to avoid URL length limits (max 30 vias per request)
      const CHUNK_SIZE = 30;
      const chunks: TrackPoint[][] = [];

      for (let i = 0; i < gpsPoints.length; i += CHUNK_SIZE - 1) {
        chunks.push(gpsPoints.slice(i, i + CHUNK_SIZE));
      }

      const allCoords: [number, number][] = [];

      for (const chunk of chunks) {
        const lonlats = chunk.map((p) => `${p.lng},${p.lat}`).join('|');
        const url = `https://brouter.de/brouter?lonlats=${lonlats}&profile=hiking-mountain&format=geojson`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`BRouter error: ${response.status}`);
        }

        const data = await response.json();
        const feature = data.features?.[0];
        if (!feature) {
          throw new Error('No route returned from BRouter');
        }

        const coords: [number, number][] = feature.geometry.coordinates.map(
          (c: number[]) => [c[0], c[1]] // [lng, lat]
        );

        allCoords.push(...coords);
      }

      setState((prev) => ({
        ...prev,
        snappedCoordinates: allCoords,
      }));

      toast.success('Snapped to paths');
    } catch (e) {
      toast.error(`Failed to snap: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, [state.points]);

  // Calculate stats
  const getStats = useCallback(() => {
    const coords: [number, number, number | null][] = state.points.map((p) => [
      p.lat,
      p.lng,
      p.ele,
    ]);

    const distance = calculateTotalDistance(coords);
    const { ascent, descent } = calculateElevationChanges(coords);

    return {
      distance,
      ascent,
      descent,
      pointCount: state.points.length,
    };
  }, [state.points]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return {
    status: state.status,
    points: state.points,
    snappedCoordinates: state.snappedCoordinates,
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
    hasInProgressTrack: state.status === 'recording' || state.status === 'paused',
  };
}
