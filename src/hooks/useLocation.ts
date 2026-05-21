import { useState, useEffect } from 'react';

export interface UserLocation {
  lat: number;
  lon: number;
  district: string;
  city: string;
  fullAddress: string;
  status: 'idle' | 'loading' | 'granted' | 'denied' | 'manual';
}

const STORAGE_KEY = 'user_loc_v3';

const defaults: UserLocation = {
  lat: 41.0082, lon: 28.9784, district: '', city: 'İstanbul',
  fullAddress: 'İstanbul', status: 'idle',
};

function loadSaved(): UserLocation {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : defaults; }
  catch { return defaults; }
}

// ─── Adres arama (Nominatim — ücretsiz, Türkiye sınırlı) ───

export interface AddressResult {
  lat: number;
  lon: number;
  display: string;
  district: string;
  city: string;
}

export async function searchAddress(query: string): Promise<AddressResult[]> {
  if (!query.trim() || query.length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' Türkiye')}&format=json&addressdetails=1&limit=5&accept-language=tr&countrycodes=tr`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((r: Record<string, unknown>) => {
      const addr = (r.address || {}) as Record<string, string>;
      return {
        lat: parseFloat(r.lat as string),
        lon: parseFloat(r.lon as string),
        display: (r.display_name as string || '').split(',').slice(0, 3).join(','),
        district: addr.suburb || addr.neighbourhood || addr.quarter || addr.town || addr.county || '',
        city: addr.city || addr.province || addr.state || '',
      };
    });
  } catch { return []; }
}

// ─── Reverse geocode ───

async function reverseGeocode(lat: number, lon: number): Promise<{ district: string; city: string; fullAddress: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=tr&zoom=17`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const district = addr.suburb || addr.neighbourhood || addr.quarter || addr.town || addr.county || '';
      const city = addr.city || addr.province || addr.state || '';
      const road = addr.road || '';
      const fullAddress = [road, district, city].filter(Boolean).join(', ');
      return { district, city, fullAddress };
    }
  } catch { /**/ }
  return { district: '', city: 'Türkiye', fullAddress: '' };
}

// ─── Popüler semtler (hızlı seçim) ───

export const popularDistricts = [
  { name: 'Kadıköy', city: 'İstanbul', lat: 40.9927, lon: 29.0230 },
  { name: 'Bayrampaşa', city: 'İstanbul', lat: 41.0483, lon: 28.9120 },
  { name: 'Üsküdar', city: 'İstanbul', lat: 41.0250, lon: 29.0150 },
  { name: 'Beşiktaş', city: 'İstanbul', lat: 41.0430, lon: 29.0060 },
  { name: 'Bakırköy', city: 'İstanbul', lat: 40.9830, lon: 28.8720 },
  { name: 'Ataşehir', city: 'İstanbul', lat: 40.9840, lon: 29.1190 },
  { name: 'Pendik', city: 'İstanbul', lat: 40.8760, lon: 29.2330 },
  { name: 'Çankaya', city: 'Ankara', lat: 39.9180, lon: 32.8540 },
  { name: 'Keçiören', city: 'Ankara', lat: 39.9710, lon: 32.8640 },
  { name: 'Bornova', city: 'İzmir', lat: 38.4690, lon: 27.2200 },
  { name: 'Karşıyaka', city: 'İzmir', lat: 38.4570, lon: 27.1100 },
  { name: 'Nilüfer', city: 'Bursa', lat: 40.2120, lon: 28.9420 },
  { name: 'Muratpaşa', city: 'Antalya', lat: 36.8870, lon: 30.7000 },
  { name: 'Şahinbey', city: 'Gaziantep', lat: 37.0550, lon: 37.3700 },
  { name: 'Seyhan', city: 'Adana', lat: 36.9910, lon: 35.3280 },
];

// ─── Hook ───

export function useLocation() {
  const [location, setLocation] = useState<UserLocation>(loadSaved);

  const save = (loc: UserLocation) => {
    setLocation(loc);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  };

  const requestGPS = () => {
    if (!navigator.geolocation) {
      save({ ...location, status: 'denied' });
      return;
    }
    save({ ...location, status: 'loading' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = +pos.coords.latitude.toFixed(5);
        const lon = +pos.coords.longitude.toFixed(5);
        // Hemen koordinatla kaydet, isim sonra gelsin
        save({ lat, lon, district: '', city: 'Konumunuz', fullAddress: '', status: 'granted' });
        // Arka planda semt adını bul
        reverseGeocode(lat, lon).then((geo) => {
          save({ lat, lon, district: geo.district, city: geo.city, fullAddress: geo.fullAddress, status: 'granted' });
        }).catch(() => {});
      },
      (err) => {
        console.warn('GPS hatası:', err.code, err.message);
        // Denied durumunda default konumu koru ama status güncelle
        save({ ...defaults, status: 'denied' });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const setManualLocation = (lat: number, lon: number, district: string, city: string) => {
    save({ lat, lon, district, city, fullAddress: [district, city].filter(Boolean).join(', '), status: 'manual' });
  };

  // İlk açılışta: kayıtlı konum varsa kullan, yoksa izin durumuna göre GPS iste
  useEffect(() => {
    const saved = loadSaved();
    if (saved.status === 'granted' || saved.status === 'manual') {
      setLocation(saved);
      return;
    }

    const initGps = async () => {
      try {
        if ('permissions' in navigator && navigator.permissions?.query) {
          const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          if (result.state === 'granted') {
            requestGPS();
            return;
          }
          if (result.state === 'prompt') {
            setTimeout(() => requestGPS(), 800);
            return;
          }
          save({ ...defaults, status: 'denied' });
          return;
        }
      } catch {
        // permissions API yoksa direkt dene
      }
      setTimeout(() => requestGPS(), 800);
    };

    initGps();
  }, []);

  const displayName = location.district
    ? `${location.district}, ${location.city}`
    : location.city || 'Konum seç';

  return { location, requestGPS, setManualLocation, displayName };
}
