import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon (broken by bundlers)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/** Reverse-geocode via Nominatim (requires User-Agent per their policy) */
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'iDonate-Web/1.0 (institution-registration)',
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name || null;
  } catch (e) {
    console.warn('Reverse geocoding failed:', e);
    return null;
  }
}

/** Click handler inside the Leaflet map */
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Flies map to a position when it changes */
function FlyToPosition({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, zoom, { duration: 1.2 });
    }
  }, [position[0], position[1]]);
  return null;
}

/**
 * LocationPicker — two-mode location selector:
 *   1. Detect GPS   — browser geolocation
 *   2. Select on Map — click on an interactive map
 *
 * Props:
 *   onChange({ latitude, longitude, locationName }) — called when location updates
 */
export default function LocationPicker({ onChange }) {
  const [mode, setMode] = useState('gps'); // 'gps' | 'map'
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'detecting' | 'success' | 'error'
  const [userPosition, setUserPosition] = useState(null); // user's current position for map centering
  const [mapCenter, setMapCenter] = useState([7.9465, -1.0232]); // default: Ghana center
  const [mapZoom, setMapZoom] = useState(7);

  // On mount: silently get user position for map centering
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = [position.coords.latitude, position.coords.longitude];
          setUserPosition(pos);
          setMapCenter(pos);
          setMapZoom(14);
        },
        () => {
          // Silently fail — map stays on Ghana center
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    }
  }, []);

  // Notify parent when coords/name change
  useEffect(() => {
    if (coords) {
      onChange?.({ ...coords, locationName });
    }
  }, [coords, locationName]);

  const updateLocation = async (lat, lng) => {
    const rounded = {
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
    };
    setCoords(rounded);
    setLocationName(null);
    const name = await reverseGeocode(rounded.latitude, rounded.longitude);
    setLocationName(name);
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    setGpsStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await updateLocation(position.coords.latitude, position.coords.longitude);
        setGpsStatus('success');
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleMapClick = async (lat, lng) => {
    await updateLocation(lat, lng);
  };

  return (
    <div className="space-y-3">
      {/* Tab Switcher */}
      <div className="flex rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setMode('gps')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === 'gps'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📡 Detect GPS
        </button>
        <button
          type="button"
          onClick={() => setMode('map')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === 'map'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🗺️ Select on Map
        </button>
      </div>

      {/* GPS Mode */}
      {mode === 'gps' && (
        <div className="text-center py-4">
          {gpsStatus === 'idle' && (
            <button
              type="button"
              onClick={handleDetectGPS}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <svg className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Detect my location
            </button>
          )}
          {gpsStatus === 'detecting' && (
            <div className="flex items-center justify-center text-sm text-gray-500">
              <svg className="animate-spin mr-2 h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Detecting your location…
            </div>
          )}
          {gpsStatus === 'success' && (
            <div>
              <button
                type="button"
                onClick={handleDetectGPS}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Re-detect location
              </button>
            </div>
          )}
          {gpsStatus === 'error' && (
            <div>
              <p className="text-sm text-amber-600 mb-2">Could not detect location.</p>
              <button
                type="button"
                onClick={handleDetectGPS}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Try again
              </button>
              <span className="text-sm text-gray-400 mx-2">or</span>
              <button
                type="button"
                onClick={() => setMode('map')}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Select on map
              </button>
            </div>
          )}
        </div>
      )}

      {/* Map Mode */}
      {mode === 'map' && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Click on the map to set your institution's location</p>
          <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: 300 }}>
            <MapContainer
              center={coords ? [coords.latitude, coords.longitude] : mapCenter}
              zoom={coords ? 15 : mapZoom}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onMapClick={handleMapClick} />
              <FlyToPosition
                position={coords ? [coords.latitude, coords.longitude] : mapCenter}
                zoom={coords ? 15 : mapZoom}
              />
              {coords && (
                <Marker position={[coords.latitude, coords.longitude]} />
              )}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Status: show detected coordinates + address */}
      {coords && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2.5">
          <p className="text-sm text-green-700 font-medium">
            ✓ Location set: {coords.latitude}, {coords.longitude}
          </p>
          {locationName ? (
            <p className="text-sm text-green-600 mt-0.5 truncate" title={locationName}>
              📍 {locationName}
            </p>
          ) : (
            <p className="text-sm text-gray-400 mt-0.5 italic">Loading address…</p>
          )}
        </div>
      )}
    </div>
  );
}
