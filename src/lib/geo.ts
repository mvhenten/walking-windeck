/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate elevation gain and loss from coordinate array
 */
export function calculateElevationChanges(coords: [number, number, number | null][]) {
  let ascent = 0;
  let descent = 0;

  for (let i = 1; i < coords.length; i++) {
    const prevEle = coords[i - 1]?.[2];
    const currEle = coords[i]?.[2];

    if (prevEle != null && currEle != null) {
      const diff = currEle - prevEle;
      if (diff > 0) {
        ascent += diff;
      } else if (diff < 0) {
        descent += Math.abs(diff);
      }
    }
  }

  return { ascent, descent };
}

/**
 * Calculate total distance from coordinate array
 */
export function calculateTotalDistance(coords: [number, number, number | null][]): number {
  let total = 0;

  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    if (prev && curr) {
      total += haversineDistance(prev[0], prev[1], curr[0], curr[1]);
    }
  }

  return total;
}

/**
 * Format duration in seconds to mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
