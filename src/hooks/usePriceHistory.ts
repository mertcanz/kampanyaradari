// Fiyat Geçmişi — her arama sonucunu kaydet, zaman içinde trend göster

import { type MarketProduct } from '../api/market-api';

export interface PriceRecord {
  date: string;       // YYYY-MM-DD
  price: number;
  marketId: string;
  marketName: string;
}

export interface ProductHistory {
  name: string;
  emoji: string;
  unit: string;
  records: PriceRecord[]; // en yeni en sonda
  lowestEver: number;
  highestEver: number;
  currentAvg: number;
  trend: 'up' | 'down' | 'stable';
}

const STORAGE_KEY = 'price_history';
const MAX_PRODUCTS = 200;
const MAX_RECORDS_PER_PRODUCT = 30;

type HistoryMap = Record<string, {
  emoji: string;
  unit: string;
  records: PriceRecord[];
}>;

function loadHistory(): HistoryMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveHistory(h: HistoryMap) {
  // Boyut kontrolü — en eski ürünleri sil
  const keys = Object.keys(h);
  if (keys.length > MAX_PRODUCTS) {
    const toRemove = keys.slice(0, keys.length - MAX_PRODUCTS);
    for (const k of toRemove) delete h[k];
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  } catch { /* quota */ }
}

// Normalize product name for grouping
function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/\s+\d+.*$/, '').trim(); // "Süt 1L" → "süt"
}

// Gelen ürünleri geçmişe kaydet
export function recordPrices(products: MarketProduct[]) {
  const today = new Date().toISOString().split('T')[0];
  const history = loadHistory();

  for (const p of products) {
    const key = normalizeKey(p.name);
    if (!history[key]) {
      history[key] = { emoji: p.emoji, unit: p.unit, records: [] };
    }

    // Bugün aynı marketten zaten kayıt var mı?
    const existing = history[key].records.find(
      (r) => r.date === today && r.marketId === p.marketId
    );
    if (existing) {
      existing.price = p.price; // güncelle
    } else {
      history[key].records.push({
        date: today,
        price: p.price,
        marketId: p.marketId,
        marketName: p.marketName,
      });
    }

    // Max kayıt
    if (history[key].records.length > MAX_RECORDS_PER_PRODUCT) {
      history[key].records = history[key].records.slice(-MAX_RECORDS_PER_PRODUCT);
    }
  }

  saveHistory(history);
}

// Belirli ürünün geçmişini getir
export function getProductHistory(productName: string): ProductHistory | null {
  const history = loadHistory();
  const key = normalizeKey(productName);
  const entry = history[key];
  if (!entry || entry.records.length === 0) return null;

  const prices = entry.records.map((r) => r.price);
  const lowestEver = Math.min(...prices);
  const highestEver = Math.max(...prices);
  const currentAvg = prices.slice(-6).reduce((s, p) => s + p, 0) / Math.min(prices.length, 6);

  // Trend: son 3 kaydın ortalaması vs önceki 3
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (entry.records.length >= 4) {
    const recent = prices.slice(-3).reduce((s, p) => s + p, 0) / 3;
    const older = prices.slice(-6, -3).reduce((s, p) => s + p, 0) / Math.min(3, prices.slice(-6, -3).length || 1);
    if (older > 0) {
      const change = (recent - older) / older;
      if (change < -0.03) trend = 'down';
      else if (change > 0.03) trend = 'up';
    }
  }

  return {
    name: productName,
    emoji: entry.emoji,
    unit: entry.unit,
    records: entry.records,
    lowestEver, highestEver, currentAvg, trend,
  };
}

// Tüm kayıtlı ürünlerin özetini getir
export function getAllHistories(): ProductHistory[] {
  const history = loadHistory();
  const results: ProductHistory[] = [];

  for (const [key, entry] of Object.entries(history)) {
    if (entry.records.length < 2) continue;
    const ph = getProductHistory(key);
    if (ph) results.push(ph);
  }

  return results.sort((a, b) => b.records.length - a.records.length);
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}
