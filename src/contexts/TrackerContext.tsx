import { createContext, useContext, ReactNode } from 'react';
import { useTracker } from '../hooks/useTracker';
import type { TrackStatus, TrackPoint } from '../hooks/useTracker';

interface TrackerContextValue {
  status: TrackStatus;
  points: TrackPoint[];
  snappedCoordinates: [number, number][] | null;
  currentSpeed: number;
  currentAccuracy: number;
  elapsedTime: number;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => void;
  discard: () => void;
  snapToPaths: () => Promise<void>;
  getStats: () => {
    distance: number;
    ascent: number;
    descent: number;
    pointCount: number;
  };
  hasInProgressTrack: boolean;
}

const TrackerContext = createContext<TrackerContextValue | null>(null);

export function TrackerProvider({ children }: { children: ReactNode }) {
  const tracker = useTracker();

  return <TrackerContext.Provider value={tracker}>{children}</TrackerContext.Provider>;
}

export function useTrackerContext() {
  const context = useContext(TrackerContext);
  if (!context) {
    throw new Error('useTrackerContext must be used within TrackerProvider');
  }
  return context;
}
