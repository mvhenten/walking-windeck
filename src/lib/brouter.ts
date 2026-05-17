import { Segment } from '../types';

interface BRouterResponse {
  features?: Array<{
    geometry: {
      coordinates: [number, number, number | null][];
    };
    properties?: {
      'track-length'?: number;
      'filtered ascend'?: number;
      'plain-ascend'?: number;
    };
  }>;
}

export async function routeBetween(
  fromLngLat: [number, number],
  toLngLat: [number, number]
): Promise<Segment> {
  const url =
    `https://brouter.de/brouter?lonlats=${fromLngLat[0]},${fromLngLat[1]}|${toLngLat[0]},${toLngLat[1]}` +
    `&profile=hiking-mountain&alternativeidx=0&format=geojson`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Routing failed: ${response.status}`);
  }

  const data: BRouterResponse = await response.json();
  const feat = data.features?.[0];
  if (!feat) {
    throw new Error('No route found');
  }

  // Convert [lng, lat, ele] to [lat, lng, ele]
  const coords: [number, number, number | null][] = feat.geometry.coordinates.map((c) => [
    c[1],
    c[0],
    c[2] ?? null,
  ]);

  const props = feat.properties || {};
  const dist = Number(props['track-length']) || 0;
  const ascent = Number(props['filtered ascend'] ?? props['plain-ascend']) || 0;

  // Calculate descent from elevation data
  let descent = 0;
  for (let i = 1; i < coords.length; i++) {
    const prevEle = coords[i - 1]?.[2];
    const currEle = coords[i]?.[2];
    if (prevEle != null && currEle != null && currEle < prevEle) {
      descent += prevEle - currEle;
    }
  }

  return { coords, dist, ascent, descent };
}
