import { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  LayersControl,
  ScaleControl,
  Polyline,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TrackPoint } from '../hooks/useTracker';

// Fix Leaflet icon issue with bundlers
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapCanvasProps {
  center: [number, number];
  zoom: number;
  onMapClick?: (latlng: L.LatLng) => void;
  waypoints: [number, number][]; // [lng, lat]
  segments: Array<{
    coords: [number, number, number | null][]; // [lat, lng, ele]
  }>;
  savedRoute: [number, number][] | null; // [lat, lng]
  savedRouteKind?: 'drawn' | 'tracked';
  trackingMode?: boolean;
  trackSegments?: Array<{ point: TrackPoint }>;
  focusMarker?: { lat: number; lng: number; name?: string };
}

function LocateControl() {
  const map = useMap();

  useEffect(() => {
    let marker: L.CircleMarker | null = null;
    let accuracyCircle: L.Circle | null = null;
    let watching = false;

    const LocateControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: function (mapInstance: L.Map) {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const link = L.DomUtil.create('a', '', div);
        link.innerHTML = '◎';
        link.href = '#';
        link.title = 'Locate me';
        link.style.fontSize = '20px';
        link.style.width = '30px';
        link.style.height = '30px';
        link.style.lineHeight = '30px';
        link.style.textAlign = 'center';

        L.DomEvent.on(link, 'click', (e: Event) => {
          L.DomEvent.preventDefault(e);
          if (!watching) {
            mapInstance.locate({ watch: true, enableHighAccuracy: true });
            watching = true;
          } else if (marker) {
            mapInstance.setView(marker.getLatLng(), Math.max(mapInstance.getZoom(), 16));
          }
        });

        return div;
      },
    });

    const locateControl = new LocateControl();
    locateControl.addTo(map);

    const onLocation = (e: L.LocationEvent) => {
      if (!marker) {
        marker = L.circleMarker(e.latlng, {
          radius: 8,
          color: '#7cc4ff',
          fillColor: '#7cc4ff',
          fillOpacity: 0.8,
        }).addTo(map);
        map.setView(e.latlng, Math.max(map.getZoom(), 16));
      } else {
        marker.setLatLng(e.latlng);
      }

      if (!accuracyCircle) {
        accuracyCircle = L.circle(e.latlng, {
          radius: e.accuracy,
          color: '#7cc4ff',
          fillColor: '#7cc4ff',
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);
      } else {
        accuracyCircle.setLatLng(e.latlng).setRadius(e.accuracy);
      }
    };

    map.on('locationfound', onLocation);

    return () => {
      map.off('locationfound', onLocation);
      map.stopLocate();
      marker?.remove();
      accuracyCircle?.remove();
      locateControl.remove();
    };
  }, [map]);

  return null;
}

function showElevationPopup(map: L.Map, latlng: L.LatLng) {
  const { lat, lng } = latlng;
  const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const popup = L.popup().setLatLng(latlng).setContent('Looking up elevation…').openOn(map);
  fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`)
    .then((r) => r.json())
    .then((j: { results?: Array<{ elevation?: number }> }) => {
      const ele = j?.results?.[0]?.elevation;
      popup.setContent(ele != null ? `<b>${Math.round(ele)} m</b><br>${coords}` : coords);
    })
    .catch(() => {
      popup.setContent(coords);
    });
}

function FocusMarkerHandler({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13));
  }, [map, lat, lng]);
  return null;
}

function MapClickHandler({ onClick }: { onClick?: (latlng: L.LatLng) => void }) {
  const map = useMapEvents({
    click: (e) => {
      if (onClick) {
        onClick(e.latlng);
        return;
      }
      showElevationPopup(map, e.latlng);
    },
  });
  return null;
}

export function MapCanvas({
  center,
  zoom,
  onMapClick,
  waypoints,
  segments,
  savedRoute,
  savedRouteKind = 'drawn',
  trackingMode = false,
  trackSegments = [],
  focusMarker,
}: MapCanvasProps) {
  return (
    <MapContainer center={center} zoom={zoom} zoomControl={true} className="absolute inset-0">
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenTopoMap (contours)">
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            maxZoom={17}
            attribution='© <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA), © OSM'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="OSM standard">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            attribution="© OSM"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="CyclOSM (paths)">
          <TileLayer
            url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
            maxZoom={20}
            subdomains={['a', 'b', 'c']}
            attribution="CyclOSM | © OSM"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            attribution="Imagery © Esri"
          />
        </LayersControl.BaseLayer>
        <LayersControl.Overlay checked name="Hiking routes">
          <TileLayer
            url="https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png"
            maxZoom={18}
            opacity={0.85}
            attribution='<a href="https://hiking.waymarkedtrails.org">Waymarked Trails</a>'
          />
        </LayersControl.Overlay>
      </LayersControl>

      <ScaleControl imperial={false} />
      <LocateControl />
      <MapClickHandler onClick={onMapClick} />

      {/* Draw mode: waypoints and segments */}
      {waypoints.map((wp, i) => (
        <CircleMarker
          key={`wp-${i}`}
          center={[wp[1], wp[0]]}
          radius={6}
          pathOptions={{
            color: '#1a1d22',
            weight: 2,
            fillColor: '#b48cf2',
            fillOpacity: 1,
          }}
        />
      ))}

      {/* Draw mode segments */}
      {!trackingMode &&
        segments.map((seg, i) => (
          <Polyline
            key={`seg-${i}`}
            positions={seg.coords.map((c) => [c[0], c[1]])}
            pathOptions={{
              color: '#b48cf2',
              weight: 5,
              opacity: 0.9,
            }}
          />
        ))}

      {/* Tracking mode segments */}
      {trackingMode && trackSegments.length > 1 && (
        <>
          {/* GPS segments */}
          <Polyline
            positions={trackSegments
              .filter((s) => s.point.source === 'gps')
              .map((s) => [s.point.lat, s.point.lng])}
            pathOptions={{
              color: '#ff8c00',
              weight: 5,
              opacity: 0.9,
            }}
          />
          {/* Gap-fill segments with highlight */}
          <Polyline
            positions={trackSegments
              .filter((s) => s.point.source === 'gap-fill')
              .map((s) => [s.point.lat, s.point.lng])}
            pathOptions={{
              color: '#ff8c00',
              weight: 6,
              opacity: 1,
              dashArray: undefined,
            }}
          />
          {/* Gap-straight segments (dashed) */}
          <Polyline
            positions={trackSegments
              .filter((s) => s.point.source === 'gap-straight')
              .map((s) => [s.point.lat, s.point.lng])}
            pathOptions={{
              color: '#ff8c00',
              weight: 5,
              opacity: 0.7,
              dashArray: '10, 10',
            }}
          />
        </>
      )}

      {focusMarker && (
        <>
          <FocusMarkerHandler lat={focusMarker.lat} lng={focusMarker.lng} />
          <CircleMarker
            center={[focusMarker.lat, focusMarker.lng]}
            radius={9}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: '#ef4444',
              fillOpacity: 0.9,
            }}
          >
            {focusMarker.name && <Popup>{focusMarker.name}</Popup>}
          </CircleMarker>
        </>
      )}

      {/* Saved route */}
      {savedRoute && (
        <Polyline
          positions={savedRoute}
          pathOptions={{
            color: savedRouteKind === 'tracked' ? '#ff8c00' : '#7cc4ff',
            weight: 5,
            opacity: 0.9,
          }}
        />
      )}
    </MapContainer>
  );
}
