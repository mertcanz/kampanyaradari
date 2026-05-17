import { useState, useEffect } from 'react';

export interface UserLocation {
  lat: number;
  lon: number;
  city: string;
  status: 'idle' | 'loading' | 'granted' | 'denied' | 'error';
}

const STORAGE_KEY = 'user_location';

// Türkiye şehir merkezleri (yaklaşık)
const cities: Record<string, { lat: number; lon: number }> = {
  'İstanbul': { lat: 41.0082, lon: 28.9784 },
  'Ankara': { lat: 39.9334, lon: 32.8597 },
  'İzmir': { lat: 38.4237, lon: 27.1428 },
  'Bursa': { lat: 40.1885, lon: 29.0610 },
  'Antalya': { lat: 36.8969, lon: 30.7133 },
  'Adana': { lat: 37.0000, lon: 35.3213 },
  'Konya': { lat: 37.8746, lon: 32.4932 },
  'Gaziantep': { lat: 37.0662, lon: 37.3833 },
  'Kayseri': { lat: 38.7312, lon: 35.4787 },
  'Mersin': { lat: 36.8121, lon: 34.6415 },
  'Eskişehir': { lat: 39.7767, lon: 30.5206 },
  'Diyarbakır': { lat: 37.9144, lon: 40.2306 },
  'Samsun': { lat: 41.2928, lon: 36.3313 },
  'Trabzon': { lat: 41.0027, lon: 39.7168 },
  'Kocaeli': { lat: 40.7654, lon: 29.9408 },
  'Sakarya': { lat: 40.6940, lon: 30.4358 },
  'Denizli': { lat: 37.7765, lon: 29.0864 },
  'Malatya': { lat: 38.3552, lon: 38.3095 },
  'Erzurum': { lat: 39.9055, lon: 41.2658 },
  'Van': { lat: 38.4891, lon: 43.3800 },
};

export const cityList = Object.keys(cities);

const defaults: UserLocation = {
  lat: 41.0082, lon: 28.9784, city: 'İstanbul', status: 'idle',
};

function loadSaved(): UserLocation {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* */ }
  return defaults;
}

export function useLocation() {
  const [location, setLocation] = useState<UserLocation>(loadSaved);

  const save = (loc: UserLocation) => {
    setLocation(loc);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  };

  const requestGPS = () => {
    if (!navigator.geolocation) {
      save({ ...location, status: 'error' });
      return;
    }
    save({ ...location, status: 'loading' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = +pos.coords.latitude.toFixed(4);
        const lon = +pos.coords.longitude.toFixed(4);
        // En yakın şehri bul
        let closest = 'Konum';
        let minDist = Infinity;
        for (const [name, coords] of Object.entries(cities)) {
          const d = Math.sqrt((lat - coords.lat) ** 2 + (lon - coords.lon) ** 2);
          if (d < minDist) { minDist = d; closest = name; }
        }
        save({ lat, lon, city: closest, status: 'granted' });
      },
      () => {
        save({ ...location, status: 'denied' });
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const setCity = (cityName: string) => {
    const coords = cities[cityName];
    if (coords) {
      save({ lat: coords.lat, lon: coords.lon, city: cityName, status: 'granted' });
    }
  };

  // İlk açılışta kayıtlı konum yoksa idle kal
  useEffect(() => {
    const saved = loadSaved();
    if (saved.status === 'granted') {
      setLocation(saved);
    }
  }, []);

  return { location, requestGPS, setCity };
}
