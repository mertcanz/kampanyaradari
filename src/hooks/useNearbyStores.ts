import { useState, useEffect } from 'react';

export interface NearbyStore {
  id: number;
  name: string;
  brand: string;
  lat: number;
  lon: number;
  address: string;
  phone: string;
  opening: string;
  distanceM: number;
  marketId: string; // a101, bim, sok vs. (brand'den türetilir)
  logo: string;
}

const BACKEND = 'https://kampanyaradari.vercel.app';

const brandMap: Record<string, { id: string; logo: string }> = {
  'a101': { id: 'a101', logo: '🔵' },
  'bim': { id: 'bim', logo: '🔴' },
  'şok': { id: 'sok', logo: '🟡' },
  'sok': { id: 'sok', logo: '🟡' },
  'migros': { id: 'migros', logo: '🟠' },
  'carrefour': { id: 'carrefour', logo: '🔷' },
  'carrefoursa': { id: 'carrefour', logo: '🔷' },
  'tarım kredi': { id: 'tarim_kredi', logo: '🟢' },
  'getir': { id: 'getir', logo: '🟣' },
  'hakmar': { id: 'hakmar', logo: '🟤' },
  'file': { id: 'file', logo: '🏷️' },
};

function toRad(v: number) { return (v * Math.PI) / 180; }
function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function resolveBrand(name: string): { id: string; logo: string } {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(brandMap)) {
    if (lower.includes(key)) return val;
  }
  return { id: 'other', logo: '🏪' };
}

export function useNearbyStores(lat: number, lon: number, radiusKm: number, enabled = false) {
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !lat || !lon) {
      setStores([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const radiusM = radiusKm * 1000;

    fetch(`${BACKEND}/api/nearby?lat=${lat}&lon=${lon}&radius=${radiusM}`, {
      signal: AbortSignal.timeout(12000),
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('nearby_failed')))
      .then((data) => {
        const mapped: NearbyStore[] = (data.stores || [])
          .map((s: Record<string, unknown>) => {
            const brand = resolveBrand((s.name as string) || (s.brand as string) || '');
            return {
              id: s.id as number,
              name: s.name as string,
              brand: s.brand as string,
              lat: s.lat as number,
              lon: s.lon as number,
              address: s.address as string,
              phone: s.phone as string,
              opening: s.opening as string,
              distanceM: distanceM(lat, lon, s.lat as number, s.lon as number),
              marketId: brand.id,
              logo: brand.logo,
            };
          })
          .filter((s: NearbyStore) => s.marketId !== 'other')
          .sort((a: NearbyStore, b: NearbyStore) => a.distanceM - b.distanceM);
        setStores(mapped);
      })
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, [lat, lon, radiusKm, enabled]);

  return { stores, loading };
}
