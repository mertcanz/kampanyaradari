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

export function clearCache() { cachedAll = []; cachedVersion = -1; categoryCache.clear(); }

// ─── Category Lazy Load ───
//
// Her kategorinin keyword listesi (markets.ts'teki searchTerms) buraya gelir.
// Cache: kategori ID + locationVersion → aynı konum/yarıçap için tek istek.
// Paralel keyword fetch → her keyword için ayrı API isteği → birleştirilir.

interface CategoryCacheEntry {
  products: MarketProduct[];
  version: number;
}
const categoryCache = new Map<string, CategoryCacheEntry>();

export async function loadCategoryProducts(
  categoryId: string,
  keywords: string[],
  size = 15
): Promise<MarketProduct[]> {
  // Cache hit — aynı konum+yarıçap için tekrar fetch etme
  const cached = categoryCache.get(categoryId);
  if (cached && cached.version === locationVersion) return cached.products;

  // Tüm keyword'leri paralel çek
  const results = await Promise.allSettled(
    keywords.map(async (q) => {
      const res = await fetch(buildUrl(q, size), { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseTubitak(await res.json());
    })
  );

  // Aynı ürün+market kombinasyonundan sadece en yakınını tut
  const best = new Map<string, MarketProduct>();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const p of r.value) {
      const key = `${p.name}-${p.marketId}`;
      const ex = best.get(key);
      if (!ex || (p.distanceKm ?? 9999) < (ex.distanceKm ?? 9999) ||
          ((p.distanceKm ?? 9999) === (ex.distanceKm ?? 9999) && p.price < ex.price)) {
        best.set(key, p);
      }
    }
  }

  const products = Array.from(best.values())
    .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));

  categoryCache.set(categoryId, { products, version: locationVersion });
  if (products.length > 0) recordPrices(products);
  return products;
}

export function clearCategoryCache() { categoryCache.clear(); }

// ─── Product Grouping ───
//
// Mantık: Aynı ürün tipini (örn. "Süt 1L") farklı markalar ve marketler
// arasında tek bir grup olarak birleştirir.
// "İçim Süt 1L" + "Dost Süt 1L" → group: "Süt 1L" → items: [İçim@BİM, Dost@A101, ...]

export interface MarketEntry {
  marketId: string;
  marketName: string;
  marketLogo: string;
  marketColor: string;
  brand: string;
  price: number;
  unitPrice: string;
  unitPriceValue: number | null;
  discount: boolean;
  discountRatio: number | null;
  promotionText: string | null;
  distanceKm: number | null;
  depotName: string;
  imageUrl: string | null;  // bu market+markanın kendi görseli
}

export interface ProductGroup {
  id: string;               // normalize edilmiş key
  normalizedName: string;   // "Süt 1L", "Domates 1kg" vb.
  category: string;
  menuCategory: string;
  emoji: string;
  unit: string;
  imageUrl: string | null;  // API'den gelen ilk geçerli görsel
  imageFetched: boolean;    // internet araması yapıldı mı
  bestPrice: number;
  bestMarketId: string;
  bestMarketName: string;
  bestMarketColor: string;
  brands: string[];         // gruptaki tüm markalar
  markets: MarketEntry[];   // market × marka kombinasyonları, fiyata göre sıralı
  hasDiscount: boolean;
  totalStores: number;
}

/** Başından marka adını çıkarır: "İçim Süt 1L" → "Süt 1L" */
function stripBrand(title: string, brand: string): string {
  const t = title.trim();
  const b = (brand || '').trim();
  if (b && t.toLowerCase().startsWith(b.toLowerCase())) {
    return t.slice(b.length).trim();
  }
  return t;
}

/** Gruplama anahtarı için normalize: birim varyasyonlarını eşleştirir */
function toGroupKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b(\d+[\.,]?\d*)\s*(litre|lt)\b/g, '$11l')
    .replace(/\b(\d+[\.,]?\d*)\s*(kilogram)\b/g, '$1kg')
    .replace(/\b(\d+[\.,]?\d*)\s*(gram|gr)\b/gi, '$1g')
    .replace(/\b(\d+[\.,]?\d*)\s*(mililitre)\b/g, '$1ml')
    .replace(/\b(\d+[\.,]?\d*)\s*(adet)\b/g, '$1ad')
    .replace(/['']/g, '')
    .trim();
}

export function groupProducts(products: MarketProduct[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>();

  for (const p of products) {
    const normalized = stripBrand(p.name, p.brand);
    const key = toGroupKey(normalized);

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        normalizedName: normalized,
        category: p.category,
        menuCategory: p.menuCategory,
        emoji: p.emoji,
        unit: p.unit,
        imageUrl: p.imageUrl,
        imageFetched: false,
        bestPrice: p.price,
        bestMarketId: p.marketId,
        bestMarketName: p.marketName,
        bestMarketColor: p.marketColor,
        brands: [],
        markets: [],
        hasDiscount: false,
        totalStores: 0,
      });
    }

    const g = map.get(key)!;

    // Görsel: API'den gelen ilk geçerli URL
    if (!g.imageUrl && p.imageUrl) g.imageUrl = p.imageUrl;

    // En ucuz fiyat
    if (p.price < g.bestPrice) {
      g.bestPrice = p.price;
      g.bestMarketId = p.marketId;
      g.bestMarketName = p.marketName;
      g.bestMarketColor = p.marketColor;
    }

    // Markalar (tekrarsız)
    if (p.brand && !g.brands.includes(p.brand)) g.brands.push(p.brand);

    // Market girişi — her market+marka kombinasyonu bir satır
    g.markets.push({
      marketId: p.marketId,
      marketName: p.marketName,
      marketLogo: p.marketLogo,
      marketColor: p.marketColor,
      brand: p.brand,
      price: p.price,
      unitPrice: p.unitPrice,
      unitPriceValue: p.unitPriceValue,
      discount: p.discount,
      discountRatio: p.discountRatio,
      promotionText: p.promotionText,
      distanceKm: p.distanceKm,
      depotName: p.depotName,
      imageUrl: p.imageUrl,
    });

    if (p.discount) g.hasDiscount = true;
    g.totalStores++;
  }

  // Her grubun market listesini fiyata göre sırala
  for (const g of map.values()) {
    g.markets.sort((a, b) => a.price - b.price);
  }

  // Grupları alfabetik sırala (Türkçe)
  return Array.from(map.values()).sort((a, b) =>
    a.normalizedName.localeCompare(b.normalizedName, 'tr')
  );
}

// ─── Lazy Image Fetcher ───
//
// Kullanım (UI'da):
//   const url = await fetchProductImage('Süt 1L', 'İçim');
//   if (url) setImageUrl(url);

const imageCache = new Map<string, string | null>();

export async function fetchProductImage(name: string, brand: string): Promise<string | null> {
  const cacheKey = `${brand}:${name}`.toLowerCase();
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey) ?? null;

  try {
    const url = `${BACKEND_URL}/api/product-image?name=${encodeURIComponent(name)}&brand=${encodeURIComponent(brand)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) { imageCache.set(cacheKey, null); return null; }
    const data = await res.json() as { imageUrl?: string | null };
    const img = data.imageUrl ?? null;
    imageCache.set(cacheKey, img);
    return img;
  } catch {
    imageCache.set(cacheKey, null);
    return null;
  }
}
