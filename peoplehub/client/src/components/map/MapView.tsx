import { useRef, useEffect, Fragment } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
// Car marker image is at /icons/car-marker.png
import RadarSearch from '../common/RadarSearch';
import 'maplibre-gl/dist/maplibre-gl.css';

// Self-hosted tile server (docker) or free public tiles as fallback
const TILE_SERVER_URL = import.meta.env.VITE_TILE_SERVER_URL || '';
const MAP_STYLE = TILE_SERVER_URL
  ? `${TILE_SERVER_URL}/styles/basic/style.json`
  : 'https://tiles.openfreemap.org/styles/liberty';

export interface TripMarkerItem {
  id: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
}

interface MapViewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  pickupLocation?: { lat: number; lng: number } | null;
  dropoffLocation?: { lat: number; lng: number } | null;
  driverLocation?: { lat: number; lng: number; heading?: number } | null;
  userLocation?: { lat: number; lng: number; heading?: number } | null;
  routeGeometry?: GeoJSON.LineString | null;
  searchingForDriver?: boolean;
  /** Маркеры заказов для экрана водителя (откуда/куда по каждому заказу) */
  tripMarkers?: TripMarkerItem[] | null;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
  className?: string;
}

// Центр Казахстана (Астана) как дефолт
const DEFAULT_CENTER = { lat: 51.1694, lng: 71.4491 };

export default function MapView({
  center,
  zoom = 13,
  pickupLocation,
  dropoffLocation,
  driverLocation,
  userLocation,
  routeGeometry,
  searchingForDriver = false,
  tripMarkers = null,
  onMapClick,
  interactive = true,
  className = '',
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);

  const mapCenter = center || pickupLocation || DEFAULT_CENTER;

  // Автоподгонка bounds когда есть pickup + dropoff
  useEffect(() => {
    if (!mapRef.current || !pickupLocation || !dropoffLocation) return;

    const bounds: [[number, number], [number, number]] = [
      [
        Math.min(pickupLocation.lng, dropoffLocation.lng) - 0.01,
        Math.min(pickupLocation.lat, dropoffLocation.lat) - 0.01,
      ],
      [
        Math.max(pickupLocation.lng, dropoffLocation.lng) + 0.01,
        Math.max(pickupLocation.lat, dropoffLocation.lat) + 0.01,
      ],
    ];

    mapRef.current.fitBounds(bounds, { padding: 60, duration: 800 });
  }, [pickupLocation, dropoffLocation]);

  // Следим за водителем во время поездки
  useEffect(() => {
    if (!mapRef.current || !driverLocation) return;
    mapRef.current.easeTo({
      center: [driverLocation.lng, driverLocation.lat],
      duration: 1000,
    });
  }, [driverLocation]);

  // Маршрут GeoJSON
  const routeGeoJSON: GeoJSON.Feature | null = routeGeometry
    ? {
        type: 'Feature',
        properties: {},
        geometry: routeGeometry,
      }
    : null;

  return (
    <div className={`relative ${className}`}>
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={{
          longitude: mapCenter.lng,
          latitude: mapCenter.lat,
          zoom,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        onClick={(e) => {
          if (onMapClick) {
            onMapClick(e.lngLat.lat, e.lngLat.lng);
          }
        }}
        interactive={interactive}
        attributionControl={false}
      >
        {/* Attribution: small map name */}
        <div className="absolute bottom-1 left-1 z-10 pointer-events-none">
          <span className="text-[9px] text-gray-400/70 font-medium">OpenFreeMap</span>
        </div>

        {/* Маршрут */}
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                'line-color': '#0074c5',
                'line-width': 4,
                'line-opacity': 0.8,
              }}
              layout={{
                'line-join': 'round',
                'line-cap': 'round',
              }}
            />
          </Source>
        )}

        {/* Маркер: Моё местоположение (синяя точка + направление) */}
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <div className="relative flex items-center justify-center">
              {/* Direction cone */}
              {userLocation.heading != null && (
                <div
                  className="absolute w-16 h-16"
                  style={{
                    transform: `rotate(${userLocation.heading}deg)`,
                    background: 'conic-gradient(from -20deg, transparent 0deg, rgba(59,130,246,0.15) 20deg, rgba(59,130,246,0.15) 340deg, transparent 360deg)',
                    borderRadius: '50%',
                  }}
                />
              )}
              <div className="w-4 h-4 bg-blue-500 rounded-full border-[2.5px] border-white shadow-md z-10" />
              <div className="absolute w-8 h-8 bg-blue-400/20 rounded-full animate-pulse" />
            </div>
          </Marker>
        )}

        {/* Маркер: Точка подачи — при поиске водителя: радар */}
        {pickupLocation && searchingForDriver && (
          <Marker
            longitude={pickupLocation.lng}
            latitude={pickupLocation.lat}
            anchor="center"
          >
            <RadarSearch size={140} showMe />
          </Marker>
        )}
        {pickupLocation && !searchingForDriver && (
          <Marker
            longitude={pickupLocation.lng}
            latitude={pickupLocation.lat}
            anchor="bottom"
          >
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-green-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
                A
              </div>
              <div className="w-1 h-2 bg-green-500" />
            </div>
          </Marker>
        )}

        {/* Маркер: Точка назначения */}
        {dropoffLocation && (
          <Marker
            longitude={dropoffLocation.lng}
            latitude={dropoffLocation.lat}
            anchor="bottom"
          >
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-red-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
                B
              </div>
              <div className="w-1 h-2 bg-red-500" />
            </div>
          </Marker>
        )}

        {/* Маркер: Водитель */}
        {driverLocation && (
          <Marker
            longitude={driverLocation.lng}
            latitude={driverLocation.lat}
            anchor="center"
            rotation={driverLocation.heading ?? 0}
            rotationAlignment="map"
          >
            <img
              src="/icons/car-marker.png"
              alt="driver"
              style={{ width: 40, height: 40 }}
              className="drop-shadow-lg"
            />
          </Marker>
        )}

        {/* Маркеры заказов (экран водителя): откуда — зелёные, куда — красные */}
        {tripMarkers?.map((t) => (
          <Fragment key={t.id}>
            <Marker longitude={t.pickupLng} latitude={t.pickupLat} anchor="bottom">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow flex items-center justify-center text-[10px] font-bold text-white">
                  A
                </div>
                <div className="w-0.5 h-1 bg-green-500" />
              </div>
            </Marker>
            <Marker longitude={t.dropoffLng} latitude={t.dropoffLat} anchor="bottom">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow flex items-center justify-center text-[10px] font-bold text-white">
                  B
                </div>
                <div className="w-0.5 h-1 bg-red-500" />
              </div>
            </Marker>
          </Fragment>
        ))}
      </Map>
    </div>
  );
}
