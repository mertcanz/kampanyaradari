// ─── Market API - TÜBİTAK marketfiyati.org.tr ───

import { generateLivePrices, type LiveProduct } from '../engine/dynamic-pricing';
import { resolveMarket, getProductEmoji, categories } from '../data/markets';
import { recordPrices } from '../hooks/usePriceHistory';

const BACKEND_URL = 'https://kampanyaradari.vercel.app';

// ─── State ───

export type ConnectionStatus = 'live' | 'simulation' | 'connecting' | 'error';

interface APIState {
  status: ConnectionStatus;
  lastUpdate: Date | null;
  source: string;
  productCount: number;
}

let currentState: APIState = {
  status: 'connecting', lastUpdate: null, source: 'Bağlanıyor...', productCount: 0,
};

const listeners: Set<(state: APIState) => void> = new Set();

export function subscribeAPI(fn: (state: APIState) => void): () => void {
  listeners.add(fn);
  fn(currentState);
  return () => { listeners.delete(fn); };
}

function updateState(partial: Partial<APIState>) {
  currentState = { ...currentState, ...partial };
  listeners.forEach((fn) => fn(currentState));
}

// ─── Location ───

let currentLat = 41.0082;
let currentLon = 28.9784;

export function setAPILocation(lat: number, lon: number) {
  if (lat !== currentLat || lon !== currentLon) {
    currentLat = lat;
    currentLon = lon;
    cachedAll = []; // Konum değişince cache'i temizle
  }
}

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
  price: number;
  unitPrice: string;
  unitPriceValue: number | null;
  discount: boolean;
  discountRatio: number | null;
  promotionText: string | null;
  indexTime: string;
  source: 'api' | 'simulation';
}

// ─── Parse TÜBİTAK API ───

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
      const marketApi = (depot.marketAdi || '') as string;
      const market = resolveMarket(marketApi);

      products.push({
        id: `${item.id}-${depot.depotId}`,
        name: title, brand, category: mainCat, menuCategory: menuCat,
        emoji, unit, imageUrl,
        marketId: market.id, marketName: market.name,
        marketLogo: market.logo, marketColor: market.color,
        depotName: (depot.depotName || '') as string,
        price: depot.price as number,
        unitPrice: (depot.unitPrice || '') as string,
        unitPriceValue: (depot.unitPriceValue || null) as number | null,
        discount: (depot.discount || false) as boolean,
        discountRatio: (depot.discountRatio || null) as number | null,
        promotionText: (depot.promotionText || null) as string | null,
        indexTime: (depot.indexTime || '') as string,
        source: 'api',
      });
    }
  }
  return products;
}

// ─── Simulation Fallback ───

function simToMarket(p: LiveProduct): MarketProduct {
  const market = resolveMarket(p.marketId);
  return {
    id: p.id, name: p.name, brand: p.brand,
    category: p.category, menuCategory: '', emoji: p.emoji,
    unit: p.unit, imageUrl: null,
    marketId: market.id, marketName: market.name,
    marketLogo: market.logo, marketColor: market.color,
    depotName: '', price: p.currentPrice, unitPrice: '', unitPriceValue: null,
    discount: p.currentPrice < p.basePrice * 0.85,
    discountRatio: Math.round((1 - p.currentPrice / p.basePrice) * 100),
    promotionText: null, indexTime: '', source: 'simulation',
  };
}

// ─── Fetch Helper ───

function buildUrl(query: string, size: number): string {
  return `${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}&size=${size}&lat=${currentLat}&lon=${currentLon}&distance=30`;
}

// ─── Initial Load ───

let cachedAll: MarketProduct[] = [];

export async function loadAllProducts(): Promise<MarketProduct[]> {
  if (cachedAll.length > 0) return cachedAll;

  const queries = categories.map((c) => c.searchTerms[0]);

  try {
    const results = await Promise.allSettled(
      queries.map(async (q) => {
        const res = await fetch(buildUrl(q, 20), { signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new Error(`${res.status}`);
        return parseTubitak(await res.json());
      })
    );

    const all: MarketProduct[] = [];
    const seen = new Set<string>();
    for (const r of results) {
      if (r.status === 'fulfilled') {
        for (const p of r.value) {
          const key = `${p.name}-${p.marketId}`;
          if (!seen.has(key)) { seen.add(key); all.push(p); }
        }
      }
    }

    if (all.length > 0) {
      cachedAll = all;
      recordPrices(all);
      updateState({ status: 'live', lastUpdate: new Date(), source: 'TÜBİTAK marketfiyati.org.tr', productCount: all.length });
      return all;
    }
  } catch { /* fall through */ }

  cachedAll = generateLivePrices().map(simToMarket);
  updateState({ status: 'simulation', lastUpdate: new Date(), source: 'Simülasyon verisi', productCount: cachedAll.length });
  return cachedAll;
}

// ─── Search ───

export async function searchProducts(query: string, size = 30): Promise<MarketProduct[]> {
  if (!query.trim()) return loadAllProducts();

  try {
    const res = await fetch(buildUrl(query, size), { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      const products = parseTubitak(data);
      if (products.length > 0) {
        recordPrices(products);
        updateState({ status: 'live', lastUpdate: new Date(), source: 'TÜBİTAK marketfiyati.org.tr', productCount: (data.numberOfFound as number) || products.length });
        return products;
      }
    }
  } catch { /* fall through */ }

  const sim = generateLivePrices();
  const filtered = sim.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.brand.toLowerCase().includes(query.toLowerCase())
  );
  updateState({ status: 'simulation', lastUpdate: new Date(), source: 'Simülasyon verisi', productCount: filtered.length });
  return filtered.map(simToMarket);
}

export function clearCache() { cachedAll = []; }
