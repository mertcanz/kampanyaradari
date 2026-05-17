// ─── Optimizer Engine ───
// Gerçek TÜBİTAK API verisiyle çalışır.
// MarketProduct tipini kullanır.

import { searchProducts, type MarketProduct } from '../api/market-api';

// ─── Types ───

export interface NeedItem {
  id: string;
  keyword: string;
  emoji: string;
}

export interface OptimizedPick {
  need: NeedItem;
  product: MarketProduct;
  alternativeCount: number;
}

export interface MarketStop {
  marketId: string;
  marketName: string;
  marketLogo: string;
  items: OptimizedPick[];
  subtotal: number;
}

export interface OptimizationResult {
  mode: 'cheapest' | 'fewest_stops' | 'balanced';
  stops: MarketStop[];
  totalCost: number;
  totalSaving: number;
  savingPercent: number;
  marketCount: number;
  unmatched: NeedItem[];
  avgPriceTotal: number;
}

// ─── Presets ───

export interface ShoppingPreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  items: NeedItem[];
}

export const shoppingPresets: ShoppingPreset[] = [
  {
    id: 'haftalik', name: 'Haftalık Temel', emoji: '🛒',
    description: 'Temel gıda ve temizlik',
    items: [
      { id: 'n1', keyword: 'domates', emoji: '🍅' },
      { id: 'n2', keyword: 'salatalık', emoji: '🥒' },
      { id: 'n3', keyword: 'patates', emoji: '🥔' },
      { id: 'n4', keyword: 'soğan', emoji: '🧅' },
      { id: 'n5', keyword: 'yumurta', emoji: '🥚' },
      { id: 'n6', keyword: 'süt', emoji: '🥛' },
      { id: 'n7', keyword: 'ekmek', emoji: '🍞' },
      { id: 'n8', keyword: 'peynir', emoji: '🧀' },
      { id: 'n9', keyword: 'yoğurt', emoji: '🥛' },
      { id: 'n10', keyword: 'tavuk', emoji: '🍗' },
      { id: 'n11', keyword: 'makarna', emoji: '🍝' },
      { id: 'n12', keyword: 'muz', emoji: '🍌' },
    ],
  },
  {
    id: 'kahvalti', name: 'Kahvaltılık', emoji: '🍳',
    description: 'Kahvaltı sofrası',
    items: [
      { id: 'k1', keyword: 'yumurta', emoji: '🥚' },
      { id: 'k2', keyword: 'peynir', emoji: '🧀' },
      { id: 'k3', keyword: 'zeytin', emoji: '🫒' },
      { id: 'k4', keyword: 'domates', emoji: '🍅' },
      { id: 'k5', keyword: 'salatalık', emoji: '🥒' },
      { id: 'k6', keyword: 'bal', emoji: '🍯' },
      { id: 'k7', keyword: 'tereyağı', emoji: '🧈' },
      { id: 'k8', keyword: 'sucuk', emoji: '🌭' },
      { id: 'k9', keyword: 'çay', emoji: '🍵' },
      { id: 'k10', keyword: 'ekmek', emoji: '🍞' },
    ],
  },
  {
    id: 'temizlik', name: 'Temizlik & Hijyen', emoji: '🧹',
    description: 'Temizlik ve bakım ürünleri',
    items: [
      { id: 't1', keyword: 'deterjan', emoji: '🧺' },
      { id: 't2', keyword: 'tuvalet kağıdı', emoji: '🧻' },
      { id: 't3', keyword: 'bulaşık', emoji: '🧴' },
      { id: 't4', keyword: 'şampuan', emoji: '🧴' },
      { id: 't5', keyword: 'diş macunu', emoji: '🪥' },
      { id: 't6', keyword: 'kağıt havlu', emoji: '🧻' },
    ],
  },
  {
    id: 'atistirma', name: 'Atıştırmalık', emoji: '🎉',
    description: 'Film gecesi için',
    items: [
      { id: 'a1', keyword: 'çikolata', emoji: '🍫' },
      { id: 'a2', keyword: 'cips', emoji: '🥔' },
      { id: 'a3', keyword: 'dondurma', emoji: '🍦' },
      { id: 'a4', keyword: 'bisküvi', emoji: '🍪' },
      { id: 'a5', keyword: 'meyve suyu', emoji: '🧃' },
    ],
  },
];

// ─── Fetch all products for needs from real API ───

async function fetchAllNeeds(needs: NeedItem[]): Promise<Record<string, MarketProduct[]>> {
  const results: Record<string, MarketProduct[]> = {};
  
  // Fetch in parallel (max 5 concurrent)
  const chunks: NeedItem[][] = [];
  for (let i = 0; i < needs.length; i += 5) {
    chunks.push(needs.slice(i, i + 5));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (need) => {
      try {
        const products = await searchProducts(need.keyword, 20);
        results[need.id] = products;
      } catch {
        results[need.id] = [];
      }
    });
    await Promise.all(promises);
  }

  return results;
}

// ─── Optimization Modes ───

function buildResult(
  mode: OptimizationResult['mode'],
  picks: OptimizedPick[],
  unmatched: NeedItem[],
  allCandidates: Record<string, MarketProduct[]>
): OptimizationResult {
  // Group by market
  const groups: Record<string, OptimizedPick[]> = {};
  for (const pick of picks) {
    const mid = pick.product.marketId;
    if (!groups[mid]) groups[mid] = [];
    groups[mid].push(pick);
  }

  const stops: MarketStop[] = Object.entries(groups).map(([mid, items]) => ({
    marketId: mid,
    marketName: items[0].product.marketName,
    marketLogo: items[0].product.marketLogo,
    items,
    subtotal: items.reduce((s, i) => s + i.product.price, 0),
  }));
  stops.sort((a, b) => b.items.length - a.items.length);

  const totalCost = stops.reduce((s, st) => s + st.subtotal, 0);

  // Calculate average price across all candidates for comparison
  let avgPriceTotal = 0;
  for (const pick of picks) {
    const candidates = allCandidates[pick.need.id] || [];
    if (candidates.length > 0) {
      avgPriceTotal += candidates.reduce((s, c) => s + c.price, 0) / candidates.length;
    }
  }

  const totalSaving = Math.max(0, avgPriceTotal - totalCost);
  const savingPercent = avgPriceTotal > 0 ? Math.round((totalSaving / avgPriceTotal) * 100) : 0;

  return {
    mode, stops, totalCost, totalSaving, savingPercent,
    marketCount: stops.length, unmatched, avgPriceTotal,
  };
}

function optimizeCheapest(needs: NeedItem[], allCandidates: Record<string, MarketProduct[]>): OptimizationResult {
  const picks: OptimizedPick[] = [];
  const unmatched: NeedItem[] = [];

  for (const need of needs) {
    const candidates = allCandidates[need.id] || [];
    if (candidates.length === 0) { unmatched.push(need); continue; }
    const best = candidates[0]; // already sorted by price
    picks.push({ need, product: best, alternativeCount: candidates.length - 1 });
  }

  return buildResult('cheapest', picks, unmatched, allCandidates);
}

function optimizeFewestStops(needs: NeedItem[], allCandidates: Record<string, MarketProduct[]>): OptimizationResult {
  // Score each market by coverage
  const allMarkets = new Set<string>();
  for (const candidates of Object.values(allCandidates)) {
    for (const p of candidates) allMarkets.add(p.marketId);
  }

  const marketScores = Array.from(allMarkets).map((mid) => {
    let covered = 0;
    let totalCost = 0;
    const matched: { need: NeedItem; product: MarketProduct }[] = [];
    for (const need of needs) {
      const candidates = (allCandidates[need.id] || []).filter((p) => p.marketId === mid);
      if (candidates.length > 0) {
        covered++;
        totalCost += candidates[0].price;
        matched.push({ need, product: candidates[0] });
      }
    }
    return { marketId: mid, covered, totalCost, matched };
  }).sort((a, b) => b.covered - a.covered || a.totalCost - b.totalCost);

  // Greedy set cover
  const assigned = new Set<string>();
  const picks: OptimizedPick[] = [];
  for (const ms of marketScores) {
    for (const m of ms.matched) {
      if (!assigned.has(m.need.id)) {
        assigned.add(m.need.id);
        picks.push({ need: m.need, product: m.product, alternativeCount: (allCandidates[m.need.id] || []).length - 1 });
      }
    }
  }

  const unmatched = needs.filter((n) => !assigned.has(n.id));
  return buildResult('fewest_stops', picks, unmatched, allCandidates);
}

function optimizeBalanced(needs: NeedItem[], allCandidates: Record<string, MarketProduct[]>, maxStops: number): OptimizationResult {
  const allMarkets = new Set<string>();
  for (const candidates of Object.values(allCandidates)) {
    for (const p of candidates) allMarkets.add(p.marketId);
  }

  // Rank markets by coverage
  const ranked = Array.from(allMarkets).map((mid) => ({
    mid,
    coverage: needs.filter((n) => (allCandidates[n.id] || []).some((p) => p.marketId === mid)).length,
  })).sort((a, b) => b.coverage - a.coverage).slice(0, 6).map((m) => m.mid);

  // Try combos of up to maxStops
  let bestResult: OptimizationResult | null = null;

  function tryCombo(combo: string[]) {
    const picks: OptimizedPick[] = [];
    const unmatched: NeedItem[] = [];
    for (const need of needs) {
      const candidates = (allCandidates[need.id] || []).filter((p) => combo.includes(p.marketId));
      if (candidates.length === 0) { unmatched.push(need); continue; }
      picks.push({ need, product: candidates[0], alternativeCount: candidates.length - 1 });
    }
    const result = buildResult('balanced', picks, unmatched, allCandidates);
    if (!bestResult ||
        result.unmatched.length < bestResult.unmatched.length ||
        (result.unmatched.length === bestResult.unmatched.length && result.totalCost < bestResult.totalCost)) {
      bestResult = result;
    }
  }

  function getCombos(arr: string[], size: number): string[][] {
    if (size === 1) return arr.map((x) => [x]);
    const r: string[][] = [];
    for (let i = 0; i <= arr.length - size; i++) {
      for (const c of getCombos(arr.slice(i + 1), size - 1)) r.push([arr[i], ...c]);
    }
    return r;
  }

  for (let size = 1; size <= Math.min(maxStops, ranked.length); size++) {
    for (const combo of getCombos(ranked, size)) tryCombo(combo);
  }

  return bestResult || optimizeCheapest(needs, allCandidates);
}

// ─── Main (async — fetches from real API) ───

export async function optimizeShoppingList(
  needs: NeedItem[],
  mode: 'cheapest' | 'fewest_stops' | 'balanced' = 'balanced',
  maxStops = 3
): Promise<OptimizationResult> {
  // 1. Fetch real prices for all needs
  const allCandidates = await fetchAllNeeds(needs);

  // 2. Sort candidates by price
  for (const key of Object.keys(allCandidates)) {
    allCandidates[key].sort((a, b) => a.price - b.price);
  }

  // 3. Optimize
  switch (mode) {
    case 'cheapest': return optimizeCheapest(needs, allCandidates);
    case 'fewest_stops': return optimizeFewestStops(needs, allCandidates);
    case 'balanced': return optimizeBalanced(needs, allCandidates, maxStops);
  }
}

// ─── Insights ───

export interface SavingsInsight {
  label: string;
  value: string;
  emoji: string;
  color: string;
}

export function getSavingsInsights(result: OptimizationResult): SavingsInsight[] {
  const insights: SavingsInsight[] = [
    { label: 'Toplam', value: `₺${result.totalCost.toFixed(2)}`, emoji: '💰', color: 'text-emerald-400' },
    { label: 'Tasarruf', value: `₺${result.totalSaving.toFixed(2)}`, emoji: '🎉', color: 'text-green-400' },
    { label: 'Market', value: `${result.marketCount}`, emoji: '🏪', color: 'text-violet-400' },
    { label: 'Bulunan', value: `${result.stops.reduce((s, st) => s + st.items.length, 0)}/${result.stops.reduce((s, st) => s + st.items.length, 0) + result.unmatched.length}`, emoji: '✅', color: 'text-teal-400' },
  ];
  return insights;
}
