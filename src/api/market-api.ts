// ─── Market API - TÜBİTAK marketfiyati.org.tr ───

import { resolveMarket, getProductEmoji } from '../data/markets';
import { recordPrices } from '../hooks/usePriceHistory';

const BACKEND_URL = 'https://kampanyaradari.vercel.app';

// ─── State ───

export type ConnectionStatus = 'live' | 'connecting' | 'error';

interface APIState {
  status: ConnectionStatus;
  lastUpdate: Date | null;
  source: string;
  productCount: number;
}

let currentState: APIState = { status: 'connecting', lastUpdate: null, source: 'Bağlanıyor...', productCount: 0 };
const listeners: Set<(s: APIState) => void> = new Set();
export function subscribeAPI(fn: (s: APIState) => void): () => void { listeners.add(fn); fn(currentState); return () => { listeners.delete(fn); }; }
function updateState(p: Partial<APIState>) { currentState = { ...currentState, ...p }; listeners.forEach((fn) => fn(currentState)); }

// ─── Location & Radius ───

let lat = 41.0082;
let lon = 28.9784;
let radius = 3;
let locationVersion = 0;

export function setAPILocation(newLat: number, newLon: number, newRadius?: number) {
  const changed = newLat !== lat || newLon !== lon || (newRadius !== undefined && newRadius !== radius);
  if (changed) {
    lat = newLat;
    lon = newLon;
    if (newRadius !== undefined) radius = newRadius;
    locationVersion++;
    cachedAll = [];
  }
}

export function setRadius(km: number) {
  if (km !== radius) {
    radius = km;
    locationVersion++;
    cachedAll = [];
  }
}

export function getLocationVersion(): number { return locationVersion; }

// ─── Product Type ───

export interface MarketProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  menuCategory: string;
  emoji: string;
  unit: string;
  imageUrl: string | null;
  marketId: string;
  marketName: string;
  marketLogo: string;
  marketColor: string;
  depotName: string;
  depotLat: number | null;
  depotLon: number | null;
  distanceKm: number | null;
  price: number;
  unitPrice: string;
  unitPriceValue: number | null;
  discount: boolean;
  discountRatio: number | null;
  promotionText: string | null;
  indexTime: string;
  source: 'api';
}

// ─── Distance helpers ───
function toRad(v: number) { return (v * Math.PI) / 180; }
function calcDistanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return +(R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa))).toFixed(2);
}

export function formatDistance(km: number | null): string {
  if (km === null) return '';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

// ─── Parse ───

function parseTubitak(data: Record<string, unknown>): MarketProduct[] {
  const products: MarketProduct[] = [];
  const content = (data.content || []) as Array<Record<string, unknown>>;
  for (const item of content) {
    const depots = (item.productDepotInfoList || []) as Array<Record<string, unknown>>;
    const title = (item.title || '') as string;
    const brand = (item.brand || '') as string;
    const mainCat = (item.main_category || '') as string;
    const menuCat = (item.menu_category || '') as string;
    const unit = (item.refinedVolumeOrWeight || '') as string;
    const imageUrl = (item.imageUrl || null) as string | null;
    const emoji = getProductEmoji(title, mainCat);
    for (const depot of depots) {
      const market = resolveMarket((depot.marketAdi || '') as string);
      const depotLat = typeof depot.latitude === 'number' ? depot.latitude : depot.latitude ? Number(depot.latitude) : null;
      const depotLon = typeof depot.longitude === 'number' ? depot.longitude : depot.longitude ? Number(depot.longitude) : null;
      const distanceKm = depotLat !== null && depotLon !== null ? calcDistanceKm(lat, lon, depotLat, depotLon) : null;
      if (distanceKm !== null && distanceKm > radius) continue;
      products.push({
        id: `${item.id}-${depot.depotId}`, name: title, brand, category: mainCat, menuCategory: menuCat,
        emoji, unit, imageUrl, marketId: market.id, marketName: market.name, marketLogo: market.logo, marketColor: market.color,
        depotName: (depot.depotName || '') as string, depotLat, depotLon, distanceKm,
        price: depot.price as number,
        unitPrice: (depot.unitPrice || '') as string, unitPriceValue: (depot.unitPriceValue || null) as number | null,
        discount: (depot.discount || false) as boolean, discountRatio: (depot.discountRatio || null) as number | null,
        promotionText: (depot.promotionText || null) as string | null, indexTime: (depot.indexTime || '') as string,
        source: 'api',
      });
    }
  }
  return products;
}

// ─── URL ───

function buildUrl(query: string, size: number): string {
  return `${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}&size=${size}&lat=${lat}&lon=${lon}&distance=${radius}`;
}

// ─── Load All ───

let cachedAll: MarketProduct[] = [];
let cachedVersion = -1;

export async function loadAllProducts(): Promise<MarketProduct[]> {
  if (cachedAll.length > 0 && cachedVersion === locationVersion) return cachedAll;

  updateState({ status: 'connecting', source: 'Bağlanıyor...', productCount: 0 });

  const phase1 = ['süt', 'domates', 'ekmek', 'yumurta'];
  const phase2 = ['tavuk', 'peynir', 'makarna', 'deterjan'];

  const results = await Promise.allSettled(
    phase1.map(async (q) => {
      const res = await fetch(buildUrl(q, 8), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseTubitak(await res.json());
    })
  );

  const bestPerProduct = new Map<string, MarketProduct>();
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const p of r.value) {
        const key = `${p.name}-${p.marketId}`;
        const existing = bestPerProduct.get(key);
        if (!existing) {
          bestPerProduct.set(key, p);
        } else {
          const pDist = p.distanceKm ?? 9999;
          const eDist = existing.distanceKm ?? 9999;
          if (pDist < eDist || (pDist === eDist && p.price < existing.price)) {
            bestPerProduct.set(key, p);
          }
        }
      }
    }
  }

  const all = Array.from(bestPerProduct.values()).sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));

  if (all.length === 0) {
    const errors = results.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason?.message).join(', ');
    updateState({ status: 'error', source: errors || 'API yanıt vermedi', productCount: 0 });
    return [];
  }

  cachedAll = all;
  cachedVersion = locationVersion;
  recordPrices(all);
  updateState({ status: 'live', lastUpdate: new Date(), source: `${radius}km`, productCount: all.length });

  // Phase 2 — arka planda geri kalanları yükle
  setTimeout(async () => {
    try {
      const p2Results = await Promise.allSettled(
        phase2.map(async (q) => {
          const res = await fetch(buildUrl(q, 10), { signal: AbortSignal.timeout(15000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return parseTubitak(await res.json());
        })
      );
      const existing = new Map(cachedAll.map((p) => [`${p.name}-${p.marketId}`, p]));
      for (const r of p2Results) {
        if (r.status === 'fulfilled') {
          for (const p of r.value) {
            const key = `${p.name}-${p.marketId}`;
            if (!existing.has(key)) existing.set(key, p);
          }
        }
      }
      cachedAll = Array.from(existing.values()).sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
      updateState({ status: 'live', lastUpdate: new Date(), source: `${radius}km`, productCount: cachedAll.length });
    } catch { /**/ }
  }, 500);

  return all;
}

// ─── Search ───

export async function searchProducts(query: string, size = 30): Promise<MarketProduct[]> {
  if (!query.trim()) return loadAllProducts();

  try {
    const res = await fetch(buildUrl(query, size), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const products = parseTubitak(data);
    recordPrices(products);
    updateState({ status: 'live', lastUpdate: new Date(), source: `TÜBİTAK • ${radius}km`, productCount: (data.numberOfFound as number) || products.length });
    return products;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Bilinmeyen hata';
    updateState({ status: 'error', source: msg, productCount: 0 });
    return [];
  }
}

export function clearCache() { cachedAll = []; cachedVersion = -1; }
