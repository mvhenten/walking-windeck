export interface GeocodeResult {
  id: string;
  name: string;
  fullName: string;
  lat: number;
  lng: number;
  type: string;
  bbox?: [number, number, number, number];
}

interface NominatimResult {
  place_id: number | string;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  boundingbox?: [string, string, string, string];
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

function shortName(r: NominatimResult): string {
  if (r.name && r.name.trim().length > 0) return r.name;
  const first = r.display_name.split(',')[0]?.trim();
  return first && first.length > 0 ? first : r.display_name;
}

export async function searchPlaces(q: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  if (q.trim().length < 2) return [];

  const url = new URL(ENDPOINT);
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '10');
  url.searchParams.set('addressdetails', '1');

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Geocode error: ${res.status}`);

  const data = (await res.json()) as NominatimResult[];

  return data.map((r) => {
    const result: GeocodeResult = {
      id: String(r.place_id),
      name: shortName(r),
      fullName: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      type: r.type ?? '',
    };
    if (r.boundingbox && r.boundingbox.length === 4) {
      result.bbox = [
        parseFloat(r.boundingbox[0]),
        parseFloat(r.boundingbox[1]),
        parseFloat(r.boundingbox[2]),
        parseFloat(r.boundingbox[3]),
      ];
    }
    return result;
  });
}
