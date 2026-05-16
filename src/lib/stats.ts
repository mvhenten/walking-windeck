import { Segment } from '../types';

export function calculateStats(segments: Segment[]) {
  let dist = 0;
  let ascent = 0;
  let descent = 0;

  for (const seg of segments) {
    dist += seg.dist;
    ascent += seg.ascent;
    descent += seg.descent;
  }

  return { dist, ascent, descent };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}
