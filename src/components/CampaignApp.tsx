import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Search, ArrowDownUp, Star, ChevronRight, X, Plus, Check,
  Zap, Heart, BadgePercent, Cpu, MapPin, Sparkles,
  RefreshCw, AlertTriangle, Share2, User,
  Trash2, ShoppingCart,
} from 'lucide-react';
import { categories, getNeedEmoji } from '../data/markets';
import { parseClipboardText } from '../engine/dynamic-pricing';
import {
  optimizeShoppingList, shoppingPresets, getSavingsInsights,
  type NeedItem, type OptimizationResult,
} from '../engine/optimizer';
import {
  searchProducts, loadAllProducts, setAPILocation, setRadius, clearCache, subscribeAPI, type MarketProduct, type ConnectionStatus,
} from '../api/market-api';
import { useLocation, searchAddress, popularDistricts, type AddressResult } from '../hooks/useLocation';
import { usePersistedState } from '../hooks/usePersistedState';
import { getAllHistories, type ProductHistory } from '../hooks/usePriceHistory';
import AdSlot from './AdSlot';
import AdminPanel, { useAdminSettings, useAnalytics } from './AdminPanel';
import { getMarketLink, getTrendyolLink, getHepsiburadaLink } from '../utils/marketLinks';
import { trackSupabaseEvent } from '../lib/supabase';

type ViewMode = 'home' | 'cart' | 'compare' | 'profile';

export default function CampaignApp() {
  const [view, setView] = useState<ViewMode>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MarketProduct[]>([]);
  const [allProducts, setAllProducts] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [apiStatus, setApiStatus] = useState<ConnectionStatus>('connecting');

  // Cart
  const [needItems, setNeedItems] = usePersistedState<NeedItem[]>('need_items', []);
  const [optimizeMode, setOptimizeMode] = usePersistedState<'cheapest' | 'fewest_stops' | 'balanced'>('opt_mode', 'balanced');
  const [maxStops, setMaxStops] = usePersistedState<number>('opt_max_stops', 3);
  const [optResult, setOptResult] = useState<OptimizationResult | null>(null);
  const [newNeedText, setNewNeedText] = useState('');
  const [checkedItems, setCheckedItems] = usePersistedState<string[]>('checked_items', []);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  // Compare
  const [compareQuery, setCompareQuery] = useState('');
  const [compareResults, setCompareResults] = useState<MarketProduct[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);

  // Filters
  const [homeMarketFilter, setHomeMarketFilter] = usePersistedState<string>('home_market_filter', 'all');
  const [homeCategoryFilter, setHomeCategoryFilter] = usePersistedState<string>('home_category_filter', 'all');
  const [homeSort, setHomeSort] = usePersistedState<'popular' | 'cheap' | 'discount' | 'unit'>('home_sort', 'popular');

  // Persisted
  const [favArray, setFavArray] = usePersistedState<string[]>('fav_ids', []);
  const favorites = new Set(favArray);
  const [priceAlerts, setPriceAlerts] = usePersistedState<Record<string, number>>('price_alerts', {});
  const [savedResults, setSavedResults] = usePersistedState<Array<{ date: string; cost: number; saving: number; markets: number; items: number }>>('saved_results', []);
  const [totalSaved, setTotalSaved] = usePersistedState<number>('total_saved', 0);
  const [recentSearches, setRecentSearches] = usePersistedState<string[]>('recent_searches', []);
  const [hasSeenOnboarding, setHasSeenOnboarding] = usePersistedState<boolean>('seen_onboarding', false);

  // UI
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [detailProduct, setDetailProduct] = useState<MarketProduct | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<ProductHistory | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const adminTapsRef = useRef(0);
  const { settings: adminSettings, setSettings: setAdminSettings } = useAdminSettings();
  const { data: analyticsData, track: localTrack, reset: resetAnalytics } = useAnalytics();
  const track = (event: string) => {
    localTrack(event as Parameters<typeof localTrack>[0]);
    trackSupabaseEvent(event, { city: location.city, radius });
  };
  const { location, requestGPS, setManualLocation, displayName } = useLocation();
  const [addressQuery, setAddressQuery] = useState('');
  const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
  const [radius, setRadiusState] = usePersistedState<number>('search_radius', 3);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const toggleFav = (id: string) => {
    if (favorites.has(id)) { setFavArray(favArray.filter((f) => f !== id)); showToast('Favoriden çıkarıldı'); }
    else { setFavArray([...favArray, id]); showToast('❤️ Favorilere eklendi'); track('favoriteAdds'); }
  };
  const addRecentSearch = (q: string) => {
    if (!q.trim()) return;
    setRecentSearches((prev: string[]) => [q, ...prev.filter((s) => s !== q)].slice(0, 8));
  };
  const addNeed = useCallback((text: string) => {
    const t = text.trim();
    if (!t || needItems.some((n) => n.keyword.toLowerCase() === t.toLowerCase())) return;
    setNeedItems((prev: NeedItem[]) => [...prev, { id: `n-${Date.now()}`, keyword: t, emoji: getNeedEmoji(t) }]);
  }, [needItems, setNeedItems]);

  // Init
  useEffect(() => {
    const unsub = subscribeAPI((s) => { setApiStatus(s.status); });
    loadPopular();
    track('pageViews');
    return unsub;
  }, []);

  useEffect(() => {
    setAPILocation(location.lat, location.lon, radius);
    loadPopular();
  }, [location.lat, location.lon, radius]);

  async function loadPopular() {
    setLoading(true);
    try { setAllProducts(await loadAllProducts()); } catch { /**/ }
    setLoading(false);
    setLastRefresh(new Date());
  }

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try { const r = await searchProducts(searchQuery, 30); setSearchResults(r); addRecentSearch(searchQuery); track('searches'); } catch { /**/ }
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const timeSince = (d: Date) => { const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); return m < 1 ? 'Az önce' : m < 60 ? `${m}dk` : `${Math.floor(m / 60)}sa`; };

  // Derived
  const comparisons = useMemo(() => {
    const g: Record<string, MarketProduct[]> = {};
    for (const p of allProducts) { const k = p.name.split(' ').slice(0, 3).join(' '); if (!g[k]) g[k] = []; g[k].push(p); }
    return Object.entries(g).filter(([, i]) => i.length >= 2).map(([n, i]) => {
      const s = [...i].sort((a, b) => a.price - b.price);
      return { name: n, emoji: s[0].emoji, items: s, saving: +(s[s.length - 1].price - s[0].price).toFixed(2) };
    }).filter((c) => c.saving > 0).sort((a, b) => b.saving - a.saving);
  }, [allProducts]);

  const marketStats = useMemo(() => {
    const s: Record<string, { count: number; logo: string; name: string }> = {};
    for (const p of allProducts) { if (!s[p.marketId]) s[p.marketId] = { count: 0, logo: p.marketLogo, name: p.marketName }; s[p.marketId].count++; }
    return Object.entries(s).sort((a, b) => b[1].count - a[1].count);
  }, [allProducts]);

  const productCategories = useMemo(() => categories.map((c) => ({
    ...c,
    count: c.searchTerms.reduce((s: number, kw: string) => s + allProducts.filter((p) => p.name.toLowerCase().includes(kw) || p.category.toLowerCase().includes(kw) || p.menuCategory.toLowerCase().includes(kw)).length, 0),
  })), [allProducts]);

  const filteredProducts = useMemo(() => {
    let items = [...allProducts];
    if (homeMarketFilter !== 'all') items = items.filter((p) => p.marketId === homeMarketFilter);
    if (homeCategoryFilter !== 'all') {
      const cat = categories.find((c) => c.id === homeCategoryFilter);
      if (cat) items = items.filter((p) => cat.searchTerms.some((kw) => p.name.toLowerCase().includes(kw) || p.category.toLowerCase().includes(kw) || p.menuCategory.toLowerCase().includes(kw)));
    }
    switch (homeSort) {
      case 'cheap': items.sort((a, b) => a.price - b.price); break;
      case 'discount': items.sort((a, b) => (b.discountRatio || 0) - (a.discountRatio || 0)); break;
      case 'unit': items.sort((a, b) => (a.unitPriceValue ?? 9999) - (b.unitPriceValue ?? 9999)); break;
    }
    return items;
  }, [allProducts, homeMarketFilter, homeCategoryFilter, homeSort]);

  // ─── Components ───

  const SkeletonRow = () => (<div className="flex items-center gap-3 rounded-xl border border-slate-700/30 bg-slate-800/30 p-3"><div className="skeleton h-11 w-11 flex-shrink-0" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/2" /></div><div className="skeleton h-6 w-16 flex-shrink-0" /></div>);
  const SkeletonGrid = ({ count = 6 }: { count?: number }) => (<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{Array.from({ length: count }).map((_, i) => <SkeletonRow key={i} />)}</div>);

  const ProductRow = ({ p, delay = 0 }: { p: MarketProduct; delay?: number }) => {
    const marketLink = adminSettings.showOnlineOrder ? getMarketLink(p.marketId, p.name) : null;
    return (
      <div onClick={() => { setDetailProduct(p); track('productClicks'); }} className="group flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 sm:p-3 transition-all hover:bg-slate-800 hover:border-slate-600 animate-fade-in cursor-pointer active:scale-[0.98] min-h-[56px]" style={{ animationDelay: `${delay}ms` }}>
        {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-12 w-12 sm:h-11 sm:w-11 rounded-xl object-cover flex-shrink-0 bg-slate-700" loading="lazy" /> :
         <div className="flex h-12 w-12 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-slate-700 text-xl flex-shrink-0">{p.emoji}</div>}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] sm:text-sm font-bold text-slate-100 truncate">{p.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {marketLink ? (
              <a href={marketLink.url} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); track('affiliateClicks'); }}
                className="text-[11px] sm:text-[10px] font-medium text-emerald-400 hover:text-emerald-300 hover:underline">
                {p.marketLogo} {p.marketName} →
              </a>
            ) : (
              <span className="text-[11px] sm:text-[10px] font-medium text-slate-400">{p.marketLogo} {p.marketName}</span>
            )}
            {p.distanceKm !== null && <span className="text-[10px] text-slate-600">📍{p.distanceKm}km</span>}
            {p.unit && <span className="text-[10px] text-slate-600">• {p.unit}</span>}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-[17px] sm:text-lg font-extrabold text-emerald-400">₺{p.price.toFixed(2)}</span>
          {p.unitPrice && <p className="text-[9px] text-slate-500">{p.unitPrice}</p>}
        </div>
        {priceAlerts[p.name.toLowerCase()] && p.price <= priceAlerts[p.name.toLowerCase()] && (
          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 flex-shrink-0 pulse-dot">🔔</span>
        )}
        <button onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }} className={`flex-shrink-0 rounded-full p-2 sm:p-1.5 transition-all ${favorites.has(p.id) ? 'text-red-400' : 'text-slate-700 sm:opacity-0 sm:group-hover:opacity-100 hover:text-red-400'}`}>
          <Heart size={16} fill={favorites.has(p.id) ? 'currentColor' : 'none'} />
        </button>
      </div>
    );
  };

  const DetailModal = () => {
    if (!detailProduct) return null;
    const p = detailProduct;
    // Aynı üründen tüm marketleri bul — mevcut dahil, fiyata göre sırala
    const allVersions = allProducts
      .filter((x) => x.name === p.name)
      .sort((a, b) => a.price - b.price);
    const cheapest = allVersions[0];
    const expensive = allVersions[allVersions.length - 1];
    const spread = allVersions.length > 1 ? +(expensive.price - cheapest.price).toFixed(2) : 0;

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDetailProduct(null)} style={{ animation: 'fadeIn 0.2s' }}>
        <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-slate-700 bg-slate-900 p-4 sm:p-5 max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
          {/* Drag handle mobilde */}
          <div className="flex justify-center mb-3 sm:hidden"><div className="h-1 w-10 rounded-full bg-slate-700" /></div>

          {/* Ürün bilgisi */}
          <div className="flex items-start gap-3 mb-4">
            {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-16 w-16 rounded-2xl object-cover bg-slate-700" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-700 text-3xl">{p.emoji}</div>}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-100 text-base">{p.name}</p>
              <p className="text-xs text-slate-500">{p.brand} • {p.unit}</p>
              {p.category && <p className="text-[10px] text-slate-600 mt-0.5">{p.category}</p>}
            </div>
            <button onClick={() => setDetailProduct(null)} className="rounded-full bg-slate-800 p-2 text-slate-400 hover:text-white"><X size={16} /></button>
          </div>

          {/* Fiyat kartı */}
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 mb-0.5">En ucuz fiyat</p>
                <p className="text-2xl font-extrabold text-emerald-400">₺{(cheapest || p).price.toFixed(2)}</p>
              </div>
              {spread > 0 && (
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 mb-0.5">Fiyat farkı</p>
                  <p className="text-lg font-bold text-amber-400">₺{spread}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <span>{(cheapest || p).marketLogo} {(cheapest || p).marketName}</span>
              {(cheapest || p).depotName && <span>• {(cheapest || p).depotName}</span>}
              {(cheapest || p).distanceKm !== null && <span>• 📍 {(cheapest || p).distanceKm}km</span>}
            </div>
            {(cheapest || p).unitPrice && <p className="text-[10px] text-slate-500 mt-1">{(cheapest || p).unitPrice}</p>}
          </div>

          {/* Tüm marketlerdeki fiyatlar */}
          {allVersions.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-400 mb-2">
                {allVersions.length > 1 ? `${allVersions.length} markette karşılaştırma` : 'Market bilgisi'}
              </h4>
              <div className="space-y-1.5">
                {allVersions.map((s, i) => (
                  <div key={s.id} className={`flex items-center gap-2 rounded-lg p-2 ${i === 0 ? 'bg-emerald-500/5 border border-emerald-500/20' : ''}`}>
                    <span className="text-sm">{s.marketLogo}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-300">{s.marketName}</span>
                        {i === 0 && allVersions.length > 1 && <span className="text-[8px] rounded-full bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 font-bold">EN UCUZ</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-600">
                        {s.depotName && <span>{s.depotName}</span>}
                        {s.distanceKm !== null && <span>📍 {s.distanceKm}km</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-sm font-bold ${i === 0 ? 'text-emerald-400' : 'text-slate-300'}`}>₺{s.price.toFixed(2)}</span>
                      {s.unitPrice && <p className="text-[9px] text-slate-600">{s.unitPrice}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aksiyon butonları */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => { addNeed(p.name); setDetailProduct(null); showToast('✅ Sepete eklendi'); }} className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 py-3 text-xs font-medium text-violet-400 hover:bg-violet-500/20 active:scale-95 transition-all">
              <Plus size={14} /> Sepete Ekle
            </button>
            <button onClick={() => {
              const key = p.name.toLowerCase();
              if (priceAlerts[key]) { const n = { ...priceAlerts }; delete n[key]; setPriceAlerts(n); showToast('Alarm kapatıldı'); }
              else { setPriceAlerts({ ...priceAlerts, [key]: p.price * 0.9 }); showToast(`🔔 ₺${(p.price * 0.9).toFixed(2)} altına düşünce uyarı`); }
            }} className={`flex items-center justify-center gap-1.5 rounded-xl border py-3 text-xs font-medium active:scale-95 transition-all ${priceAlerts[p.name.toLowerCase()] ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
              🔔 {priceAlerts[p.name.toLowerCase()] ? 'Alarm Aktif' : 'Fiyat Alarmı'}
            </button>
          </div>

          {/* Favori butonu */}
          <button onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }} className={`w-full flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium transition-all ${favorites.has(p.id) ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-slate-700 bg-slate-800 text-slate-500 hover:text-red-400'}`}>
            <Heart size={14} fill={favorites.has(p.id) ? 'currentColor' : 'none'} />
            {favorites.has(p.id) ? 'Favorilerde' : 'Favorilere Ekle'}
          </button>

          {/* Online Sipariş Ver */}
          {adminSettings.showOnlineOrder && <div className="mt-4 pt-3 border-t border-slate-800">
            <p className="text-[10px] text-slate-600 mb-2">🛒 Online sipariş ver</p>
            <div className="space-y-1.5">
              {/* Mevcut market linki */}
              {(() => {
                const link = getMarketLink(p.marketId, p.name);
                return link ? (
                  <a href={link.url} target="_blank" rel="noopener noreferrer" onClick={() => track('affiliateClicks')}
                    className={`flex items-center justify-between rounded-xl bg-gradient-to-r ${link.color} p-3 text-white active:scale-[0.98] transition-all`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.marketLogo}</span>
                      <div>
                        <p className="text-xs font-bold">{link.label}</p>
                        <p className="text-[9px] opacity-80">Bu ürünü online sipariş et</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="opacity-70" />
                  </a>
                ) : null;
              })()}

              {/* Diğer online marketler (affiliate) */}
              {adminSettings.showAffiliate && (
                <div className="flex gap-1.5">
                  <a href={getTrendyolLink(p.name)} target="_blank" rel="noopener noreferrer" onClick={() => track('affiliateClicks')}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-[11px] font-medium text-slate-400 hover:text-orange-400 hover:border-orange-500/30 transition-all">
                    🟠 Trendyol
                  </a>
                  <a href={getHepsiburadaLink(p.name)} target="_blank" rel="noopener noreferrer" onClick={() => track('affiliateClicks')}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-[11px] font-medium text-slate-400 hover:text-orange-400 hover:border-orange-500/30 transition-all">
                    🟡 Hepsiburada
                  </a>
                </div>
              )}
              <p className="text-[8px] text-slate-700 text-center mt-1">Yönlendirme linki • Fiyatlar farklılık gösterebilir</p>
            </div>
          </div>}
        </div>
      </div>
    );
  };

  // ─── HOME ───
  const renderHome = () => (
    <div className="space-y-4">
      {/* Hero kompakt */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 p-4 text-white shadow-xl sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><BadgePercent size={20} /><h1 className="text-lg font-extrabold sm:text-xl">KampanyaRadarı</h1></div>
            <div className="flex items-center gap-2 text-[11px] text-emerald-300 mt-1">
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${apiStatus === 'live' ? 'bg-emerald-500/30' : 'bg-white/15'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${apiStatus === 'live' ? 'bg-emerald-400 pulse-dot' : 'bg-white/40'}`} />
                {apiStatus === 'live' ? 'Canlı' : 'Önizleme'}
              </span>
              <button onClick={() => setShowCityPicker(!showCityPicker)} className="flex items-center gap-1 hover:text-white">
                <MapPin size={10} />
                {location.status === 'loading' ? <span className="flex items-center gap-1"><RefreshCw size={9} className="animate-spin" />Konum alınıyor...</span> :
                 location.status === 'denied' ? <span>📍 Konum seç</span> :
                 <span>{displayName} <span className="text-emerald-400/60">({radius}km)</span></span>}
              </button>
              <span>•</span>
              <button onClick={loadPopular} className={loading ? 'animate-spin' : ''}><RefreshCw size={10} /></button>
              <span className="text-emerald-400/60">{timeSince(lastRefresh)}</span>
            </div>
          </div>
          <button onClick={() => setView('cart')} className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-emerald-700 shadow hover:scale-105 active:scale-95 transition-all">
            <Cpu size={14} /> Akıllı Sepet {needItems.length > 0 && <span className="rounded-full bg-emerald-100 px-1.5 text-[10px]">{needItems.length}</span>}
          </button>
        </div>
        {showCityPicker && (
          <div className="mt-3 rounded-xl bg-white/10 backdrop-blur-sm p-3 space-y-3">
            {/* GPS butonu */}
            <button onClick={() => { requestGPS(); setShowCityPicker(false); }} className="flex w-full items-center gap-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-2.5 text-xs font-medium hover:bg-emerald-500/30 transition-all">
              <MapPin size={14} /> Konumumu Otomatik Algıla (GPS)
            </button>

            {/* Adres arama */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input type="text" placeholder="Mahalle, semt veya ilçe yaz..." value={addressQuery}
                onChange={(e) => {
                  setAddressQuery(e.target.value);
                  if (e.target.value.length >= 3) {
                    searchAddress(e.target.value).then(setAddressResults);
                  } else { setAddressResults([]); }
                }}
                className="w-full rounded-lg bg-white/10 border border-white/10 py-2.5 pl-9 pr-3 text-xs text-white placeholder-white/40 focus:border-white/30 focus:outline-none" />
            </div>

            {/* Arama sonuçları */}
            {addressResults.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {addressResults.map((r, i) => (
                  <button key={i} onClick={() => {
                    setManualLocation(r.lat, r.lon, r.district, r.city);
                    setShowCityPicker(false); setAddressQuery(''); setAddressResults([]);
                    clearCache();
                    showToast(`📍 ${r.district || r.city} — ${radius}km yarıçapta aranıyor`);
                  }} className="flex w-full items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/15 text-left transition-all">
                    <MapPin size={12} className="text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{r.display}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Yarıçap seçimi */}
            <div>
              <p className="text-[10px] text-white/40 mb-1.5">Arama yarıçapı</p>
              <div className="flex gap-1.5">
                {[1, 3, 5, 10].map((km) => (
                  <button key={km} onClick={() => {
                    setRadiusState(km);
                    setRadius(km);
                    clearCache();
                    setShowCityPicker(false);
                    showToast(`📏 ${km}km yarıçapla yeniden yükleniyor...`);
                  }} className={`flex-1 rounded-lg py-2.5 text-xs font-medium transition-all active:scale-95 ${radius === km ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}`}>
                    {km}km
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-white/30 mt-1">
                {radius <= 1 ? 'Sadece yürüme mesafesi' : radius <= 3 ? 'Yakın çevre' : radius <= 5 ? 'Geniş çevre' : 'Tüm bölge'}
              </p>
            </div>

            {/* Popüler semtler */}
            {addressResults.length === 0 && (
              <div>
                <p className="text-[10px] text-white/40 mb-1.5">Popüler semtler</p>
                <div className="flex flex-wrap gap-1.5">
                  {popularDistricts.map((d) => (
                    <button key={d.name} onClick={() => {
                      setManualLocation(d.lat, d.lon, d.name, d.city);
                      setShowCityPicker(false);
                      clearCache();
                      showToast(`📍 ${d.name}, ${d.city} — ${radius}km yarıçapta aranıyor`);
                    }} className={`rounded-full px-2.5 py-1 text-[10px] transition-all ${location.district === d.name ? 'bg-emerald-500/40 font-bold' : 'bg-white/10 hover:bg-white/20'}`}>
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Arama */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" placeholder='Ürün ara...' value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-10 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none" />
        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"><X size={16} /></button>}
        {searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl">
            {loading ? <div className="space-y-1.5 p-2">{[1,2,3].map((i) => <SkeletonRow key={i} />)}</div> :
             searchResults.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Sonuç yok</p> :
             <div className="space-y-1">{searchResults.map((p, i) => <ProductRow key={p.id} p={p} delay={i * 30} />)}</div>}
          </div>
        )}
      </div>

      {/* Son aramalar */}
      {!searchQuery && recentSearches.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {recentSearches.map((kw) => (
            <button key={kw} onClick={() => setSearchQuery(kw)} className="rounded-full border border-slate-700/50 bg-slate-800/50 px-2.5 py-1 text-[11px] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all flex-shrink-0">
              {getNeedEmoji(kw)} {kw}
            </button>
          ))}
        </div>
      )}

      {/* Filtreler: Market → Kategori → Sırala */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          <button onClick={() => setHomeMarketFilter('all')} className={`rounded-full px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs sm:text-[11px] font-medium flex-shrink-0 transition-all border active:scale-95 ${homeMarketFilter === 'all' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' : 'bg-slate-800/50 text-slate-400 border-slate-700/50'}`}>Tümü</button>
          {marketStats.map(([mid, info]) => (
            <button key={mid} onClick={() => setHomeMarketFilter(mid)} className={`rounded-full px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs sm:text-[11px] font-medium flex-shrink-0 transition-all border active:scale-95 ${homeMarketFilter === mid ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40' : 'bg-slate-800/50 text-slate-400 border-slate-700/50'}`}>
              {info.logo} {info.name}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          <button onClick={() => setHomeCategoryFilter('all')} className={`rounded-full px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs sm:text-[11px] font-medium flex-shrink-0 transition-all border active:scale-95 ${homeCategoryFilter === 'all' ? 'bg-violet-500/15 text-violet-400 border-violet-500/40' : 'bg-slate-800/50 text-slate-400 border-slate-700/50'}`}>🧺 Tümü</button>
          {productCategories.filter((c) => c.count > 0).map((cat) => (
            <button key={cat.id} onClick={() => setHomeCategoryFilter(cat.id)} className={`rounded-full px-3 py-2 sm:px-2.5 sm:py-1.5 text-xs sm:text-[11px] font-medium flex-shrink-0 transition-all border active:scale-95 ${homeCategoryFilter === cat.id ? 'bg-violet-500/15 text-violet-400 border-violet-500/40' : 'bg-slate-800/50 text-slate-400 border-slate-700/50'}`}>
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {([['popular','Önerilen'],['cheap','En ucuz'],['discount','İndirimli'],['unit','₺/Kg']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setHomeSort(k)} className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-all ${homeSort === k ? 'bg-sky-500/15 text-sky-400' : 'text-slate-600 hover:text-slate-400'}`}>{l}</button>
          ))}
          {(homeMarketFilter !== 'all' || homeCategoryFilter !== 'all') && (
            <button onClick={() => { setHomeMarketFilter('all'); setHomeCategoryFilter('all'); }} className="ml-auto text-[10px] text-red-400 hover:underline">✕ Temizle</button>
          )}
        </div>
      </div>

      {/* Ürün sayısı göstergesi */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-500">
          {filteredProducts.length > 0 ? `${filteredProducts.length} ürün` : ''}
          {(homeMarketFilter !== 'all' || homeCategoryFilter !== 'all') && ' (filtreli)'}
        </p>
        {loading && allProducts.length > 0 && <RefreshCw size={12} className="text-slate-600 animate-spin" />}
      </div>

      {/* Ürünler */}
      {loading && allProducts.length === 0 ? <SkeletonGrid count={6} /> :
       filteredProducts.length > 0 ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{filteredProducts.slice(0, 12).map((p, i) => <ProductRow key={p.id} p={p} delay={i * 20} />)}</div>
          {filteredProducts.length > 12 && adminSettings.showAds && adminSettings.adsNative && <AdSlot type="native" />}
          {filteredProducts.length > 12 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{filteredProducts.slice(12, 24).map((p) => <ProductRow key={p.id} p={p} delay={0} />)}</div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
          <p className="text-slate-500 text-sm">Ürün bulunamadı</p>
          <button onClick={() => { setHomeMarketFilter('all'); setHomeCategoryFilter('all'); }} className="mt-2 text-xs text-emerald-400 hover:underline">Filtreleri temizle</button>
        </div>
      )}

      {/* Reklam — ürünler sonrası */}
      {adminSettings.showAds && adminSettings.adsBanner && allProducts.length > 0 && <AdSlot type="banner" className="mt-2" />}

      {/* Karşılaştırma önizleme */}
      {comparisons.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">⚖️ Fiyat Farkları</span>
            <button onClick={() => setView('compare')} className="text-[10px] text-violet-400 hover:underline">Tümü →</button>
          </div>
          <div className="space-y-1">{comparisons.slice(0, 3).map((c) => (
            <div key={c.name} className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 p-2">
              <span>{c.emoji}</span>
              <span className="text-xs font-medium text-slate-300 truncate flex-1">{c.name}</span>
              <div className="flex gap-1">{c.items.slice(0, 2).map((item, i) => (
                <span key={item.id} className={`text-[9px] rounded-full px-1.5 py-0.5 ${i === 0 ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'bg-slate-700 text-slate-500'}`}>₺{item.price.toFixed(0)}</span>
              ))}</div>
              <span className="text-[9px] font-bold text-emerald-400">₺{c.saving}</span>
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );

  // ─── CART (Sepet + Optimize + Checklist) ───
  const renderCart = () => (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-violet-700 to-indigo-800 p-5 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><ShoppingCart size={22} /><h2 className="text-lg font-extrabold">Akıllı Sepet</h2></div>
          <span className="text-xs text-violet-300">{needItems.length} ürün</span>
        </div>
      </div>

      {/* Ürün ekleme */}
      <div className="flex gap-2">
        <input type="text" placeholder="Ürün ekle..." value={newNeedText} onChange={(e) => setNewNeedText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { addNeed(newNeedText); setNewNeedText(''); } }}
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none" />
        <button onClick={() => { addNeed(newNeedText); setNewNeedText(''); }} className="rounded-xl bg-violet-600 px-4 text-white hover:bg-violet-500 active:scale-95"><Plus size={18} /></button>
        <button onClick={() => setShowImport(!showImport)} className="rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-400 hover:text-violet-400 text-xs">Yapıştır</button>
      </div>

      {/* Yapıştır (inline) */}
      {showImport && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 space-y-2 animate-fade-in">
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={3} placeholder="Listeyi yapıştır..." className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none resize-none font-mono" />
          <button onClick={() => { parseClipboardText(importText).forEach((i) => addNeed(i.name)); setImportText(''); setShowImport(false); showToast('✅ Ürünler eklendi'); }} disabled={!importText.trim()} className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white w-full disabled:opacity-50">Ekle</button>
        </div>
      )}

      {/* Hazır listeler */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {shoppingPresets.map((p) => (
          <button key={p.id} onClick={() => {
            const ex = new Set(needItems.map((n) => n.keyword.toLowerCase()));
            setNeedItems((prev: NeedItem[]) => [...prev, ...p.items.filter((i) => !ex.has(i.keyword.toLowerCase())).map((i) => ({ ...i, id: `n-${Date.now()}-${Math.random()}` }))]);
            showToast(`${p.emoji} ${p.name} eklendi`);
          }} className="rounded-xl border border-slate-700/50 bg-slate-800/50 px-3 py-2 flex-shrink-0 hover:border-violet-500/50 transition-all">
            <span className="text-lg">{p.emoji}</span>
            <p className="text-[10px] text-slate-400 mt-0.5">{p.name}</p>
          </button>
        ))}
      </div>

      {/* Sepet listesi (checklist) */}
      {needItems.length > 0 && (
        <div className="space-y-1.5">
          {needItems.map((item) => (
            <div key={item.id} className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${checkedItems.includes(item.id) ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-700/50 bg-slate-800/50'}`}>
              <button onClick={() => setCheckedItems((prev: string[]) => prev.includes(item.id) ? prev.filter((i) => i !== item.id) : [...prev, item.id])}
                className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 flex-shrink-0 transition-all ${checkedItems.includes(item.id) ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-600 hover:border-violet-500'}`}>
                {checkedItems.includes(item.id) && <Check size={14} />}
              </button>
              <span className="text-lg">{item.emoji}</span>
              <span className={`flex-1 text-sm font-medium ${checkedItems.includes(item.id) ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{item.keyword}</span>
              <button onClick={() => setNeedItems((prev: NeedItem[]) => prev.filter((n) => n.id !== item.id))} className="text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>{checkedItems.filter((id) => needItems.some((n) => n.id === id)).length}/{needItems.length} tamamlandı</span>
            <button onClick={() => { setNeedItems([]); setCheckedItems([]); setOptResult(null); }} className="text-red-400 hover:underline">Listeyi temizle</button>
          </div>
        </div>
      )}

      {/* Optimize */}
      {needItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {([['cheapest','💰 En Ucuz'],['balanced','⚖️ Dengeli'],['fewest_stops','🏪 Az Market']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setOptimizeMode(k)} className={`flex-1 rounded-xl border p-2 text-[11px] font-medium transition-all ${optimizeMode === k ? 'border-violet-500 bg-violet-500/10 text-violet-400' : 'border-slate-700 text-slate-500'}`}>{l}</button>
            ))}
          </div>
          {optimizeMode === 'balanced' && (
            <div className="flex items-center gap-2 justify-center">
              <span className="text-[10px] text-slate-600">Max market:</span>
              {[2,3,4].map((n) => (<button key={n} onClick={() => setMaxStops(n)} className={`h-7 w-7 rounded-lg text-xs font-bold ${maxStops === n ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-500'}`}>{n}</button>))}
            </div>
          )}
          <button onClick={async () => {
            setLoading(true);
            try {
              const result = await optimizeShoppingList(needItems, optimizeMode, maxStops);
              setOptResult(result);
              setSavedResults((prev: typeof savedResults) => [...prev, { date: new Date().toISOString(), cost: result.totalCost, saving: result.totalSaving, markets: result.marketCount, items: result.stops.reduce((s, st) => s + st.items.length, 0) }].slice(-20));
              setTotalSaved((prev: number) => prev + result.totalSaving);
              showToast(`✅ ${result.marketCount} markette en ucuz plan bulundu!`);
            } catch { /**/ }
            setLoading(false);
          }} disabled={loading} className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50">
            {loading ? <span className="flex items-center justify-center gap-2"><RefreshCw size={16} className="animate-spin" /> Aranıyor...</span> : <span className="flex items-center justify-center gap-2"><Sparkles size={16} /> Optimize Et</span>}
          </button>
        </div>
      )}

      {/* Sonuçlar */}
      {optResult && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {getSavingsInsights(optResult).map((ins) => (
              <div key={ins.label} className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 text-center animate-count">
                <p>{ins.emoji}</p><p className={`text-lg font-extrabold ${ins.color}`}>{ins.value}</p><p className="text-[9px] text-slate-500">{ins.label}</p>
              </div>
            ))}
          </div>
          {optResult.stops.map((stop, idx) => (
            <div key={stop.marketId} className="rounded-xl border border-slate-700 overflow-hidden bg-slate-800/50">
              <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-slate-700 to-slate-600">
                <div className="flex items-center gap-2 text-white text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">{idx+1}</span>{stop.marketLogo} <span className="font-bold">{stop.marketName}</span></div>
                <span className="font-bold text-white text-sm">₺{stop.subtotal.toFixed(2)}</span>
              </div>
              <div className="divide-y divide-slate-700/50">{stop.items.map((pick) => (
                <div key={pick.need.id} className="flex items-center gap-2.5 px-3 py-2">
                  <span>{pick.need.emoji}</span>
                  <span className="flex-1 text-xs text-slate-300 truncate">{pick.product.name}</span>
                  <span className="text-xs font-bold text-emerald-400">₺{pick.product.price.toFixed(2)}</span>
                </div>
              ))}</div>
            </div>
          ))}
          {optResult.unmatched.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-xs font-bold text-amber-400 mb-1"><AlertTriangle size={12} className="inline mr-1" />Bulunamayan</p>
              <div className="flex flex-wrap gap-1">{optResult.unmatched.map((n) => <span key={n.id} className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] text-amber-400">{n.emoji} {n.keyword}</span>)}</div>
            </div>
          )}
          <button onClick={() => {
            const txt = optResult.stops.map((s, i) => `${i+1}. ${s.marketLogo} ${s.marketName} — ₺${s.subtotal.toFixed(2)}\n${s.items.map((p) => `   ${p.need.emoji} ${p.product.name} → ₺${p.product.price.toFixed(2)}`).join('\n')}`).join('\n\n');
            const full = `🛒 Akıllı Sepet (${location.city})\n${'─'.repeat(25)}\n\n${txt}\n\n💰 Toplam: ₺${optResult.totalCost.toFixed(2)}\n🎉 Tasarruf: ₺${optResult.totalSaving.toFixed(2)}`;
            if (navigator.share) navigator.share({ text: full }); else { navigator.clipboard.writeText(full); showToast('📋 Panoya kopyalandı'); }
          }} className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-all"><Share2 size={14} /> Paylaş</button>

          {adminSettings.showAds && adminSettings.adsNative && <AdSlot type="native" className="mt-2" />}
        </div>
      )}

      {needItems.length === 0 && !optResult && (
        <div className="rounded-xl border-2 border-dashed border-slate-700 p-8 text-center">
          <ShoppingCart size={40} className="mx-auto text-slate-700 mb-2" />
          <p className="text-sm text-slate-400 font-medium">Sepetiniz boş</p>
          <p className="text-xs text-slate-600 mt-1">Ürün ekleyin veya hazır liste seçin</p>
        </div>
      )}
    </div>
  );

  // ─── COMPARE ───
  const renderCompare = () => {
    const grouped: Record<string, MarketProduct[]> = {};
    for (const p of compareResults) { if (!grouped[p.name]) grouped[p.name] = []; grouped[p.name].push(p); }
    const sorted = Object.entries(grouped).filter(([, i]) => i.length >= 1).map(([n, i]) => ({ name: n, items: i.sort((a, b) => a.price - b.price) }));
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 p-5 text-white shadow-xl">
          <div className="flex items-center gap-2"><ArrowDownUp size={22} /><h2 className="text-lg font-extrabold">Fiyat Karşılaştırma</h2></div>
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder='Ürün ara...' value={compareQuery} onChange={(e) => setCompareQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setCompareLoading(true); searchProducts(compareQuery, 30).then(setCompareResults).finally(() => setCompareLoading(false)); } }}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-3 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none" />
          <button onClick={() => { setCompareLoading(true); searchProducts(compareQuery, 30).then(setCompareResults).finally(() => setCompareLoading(false)); }} className="rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-500">Ara</button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {['süt','yumurta','domates','tavuk','peynir','çay','deterjan','makarna'].map((kw) => (
            <button key={kw} onClick={() => { setCompareQuery(kw); setCompareLoading(true); searchProducts(kw, 30).then(setCompareResults).finally(() => setCompareLoading(false)); }}
              className="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] text-slate-400 hover:text-violet-400 hover:border-violet-500/50 flex-shrink-0">{kw}</button>
          ))}
        </div>
        {compareLoading && <SkeletonGrid count={3} />}
        {!compareLoading && sorted.map((g) => (
          <div key={g.name} className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
            <p className="text-xs font-bold text-slate-200 mb-2">{g.items[0]?.emoji} {g.name}</p>
            <div className="space-y-1">{g.items.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2">
                <span className="w-24 text-[11px] text-slate-400 flex-shrink-0">{item.marketLogo} {item.marketName}</span>
                <div className="flex-1 h-5 bg-slate-700/50 rounded-lg overflow-hidden relative">
                  <div className={`h-full rounded-lg ${idx === 0 ? 'bg-emerald-500/50' : 'bg-slate-600'}`} style={{ width: `${(item.price / g.items[g.items.length - 1].price) * 100}%` }} />
                  <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold ${idx === 0 ? 'text-emerald-400' : 'text-slate-400'}`}>₺{item.price.toFixed(2)}</span>
                </div>
                {item.unitPriceValue && <span className="w-16 text-right text-[9px] text-slate-600 flex-shrink-0">{item.unitPrice}</span>}
                {idx === 0 && <Star size={12} className="text-amber-400 flex-shrink-0" fill="currentColor" />}
              </div>
            ))}</div>
          </div>
        ))}
      </div>
    );
  };

  // ─── PROFILE (Favori + İstatistik + Geçmiş birleşik) ───
  const renderProfile = () => {
    const favProducts = allProducts.filter((p) => favorites.has(p.id));
    const histories = getAllHistories();
    const alertCount = Object.keys(priceAlerts).length;
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-r from-slate-700 to-slate-800 p-5 text-white shadow-xl">
          <div className="flex items-center gap-2"><User size={22} /><h2 className="text-lg font-extrabold">Profilim</h2></div>
        </div>

        {/* Özet kartlar */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { v: favArray.length, l: 'Favori', e: '❤️', c: 'text-red-400' },
            { v: alertCount, l: 'Alarm', e: '🔔', c: 'text-amber-400' },
            { v: savedResults.length, l: 'Optimize', e: '🧠', c: 'text-violet-400' },
            { v: `₺${totalSaved.toFixed(0)}`, l: 'Tasarruf', e: '💰', c: 'text-emerald-400' },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-center">
              <p className="text-sm">{s.e}</p><p className={`text-base font-extrabold ${s.c}`}>{s.v}</p><p className="text-[8px] text-slate-600">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Favoriler */}
        {favProducts.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 mb-2">❤️ Favoriler</h3>
            <div className="space-y-1.5">{favProducts.slice(0, 6).map((p) => <ProductRow key={p.id} p={p} />)}</div>
          </div>
        )}

        {/* Son optimizasyonlar */}
        {savedResults.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 mb-2">📋 Son Optimizasyonlar</h3>
            <div className="space-y-1">{[...savedResults].reverse().slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5 text-xs">
                <span className="text-slate-600 w-16">{new Date(r.date).toLocaleDateString('tr-TR')}</span>
                <span className="text-slate-400 flex-1">{r.items} ürün • {r.markets} market</span>
                <span className="font-bold text-slate-300">₺{r.cost.toFixed(0)}</span>
                <span className="font-bold text-emerald-400">+₺{r.saving.toFixed(0)}</span>
              </div>
            ))}</div>
          </div>
        )}

        {/* Fiyat geçmişi */}
        {histories.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 mb-2">📊 Fiyat Geçmişi</h3>
            {selectedHistory ? (
              <div className="animate-fade-in space-y-3">
                <button onClick={() => setSelectedHistory(null)} className="text-[10px] text-cyan-400 hover:underline">← Geri</button>
                <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
                  <div className="flex items-center gap-2 mb-3"><span className="text-2xl">{selectedHistory.emoji}</span><div><p className="font-bold text-slate-200">{selectedHistory.name}</p><p className="text-[10px] text-slate-500">{selectedHistory.records.length} kayıt</p></div></div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center rounded-lg bg-slate-700/50 p-2"><p className="text-sm font-bold text-emerald-400">₺{selectedHistory.lowestEver.toFixed(0)}</p><p className="text-[8px] text-slate-600">Min</p></div>
                    <div className="text-center rounded-lg bg-slate-700/50 p-2"><p className="text-sm font-bold text-slate-300">₺{selectedHistory.currentAvg.toFixed(0)}</p><p className="text-[8px] text-slate-600">Ort</p></div>
                    <div className="text-center rounded-lg bg-slate-700/50 p-2"><p className="text-sm font-bold text-red-400">₺{selectedHistory.highestEver.toFixed(0)}</p><p className="text-[8px] text-slate-600">Max</p></div>
                  </div>
                  <div className="flex items-end gap-0.5 h-20">{selectedHistory.records.slice(-12).map((r, i) => {
                    const range = selectedHistory.highestEver - selectedHistory.lowestEver || 1;
                    const h = ((r.price - selectedHistory.lowestEver) / range) * 100;
                    return <div key={i} className="flex-1 bg-emerald-500/40 rounded-t-sm hover:bg-emerald-500/60 transition-all group relative" style={{ height: `${Math.max(h, 8)}%` }}>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block text-[8px] text-slate-300 bg-slate-700 px-1 rounded whitespace-nowrap">₺{r.price.toFixed(0)}</div>
                    </div>;
                  })}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">{histories.slice(0, 8).map((h) => (
                <button key={h.name} onClick={() => setSelectedHistory(h)} className="flex w-full items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 p-2.5 text-left hover:border-slate-600 transition-all">
                  <span>{h.emoji}</span>
                  <span className="text-xs font-medium text-slate-300 flex-1 truncate">{h.name}</span>
                  <span className="text-xs font-bold text-emerald-400">₺{h.currentAvg.toFixed(0)}</span>
                  <span className={`text-[9px] ${h.trend === 'down' ? 'text-emerald-400' : h.trend === 'up' ? 'text-red-400' : 'text-slate-600'}`}>{h.trend === 'down' ? '↓' : h.trend === 'up' ? '↑' : '→'}</span>
                  <ChevronRight size={12} className="text-slate-700" />
                </button>
              ))}</div>
            )}
          </div>
        )}

        {adminSettings.showAds && adminSettings.adsBanner && <AdSlot type="banner" />}

        {/* Konum & Bağlantı */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
            <p className="text-[10px] text-slate-600">📍 Konum</p>
            <p className="text-xs font-medium text-slate-300">{displayName}</p>
            {location.fullAddress && <p className="text-[8px] text-slate-600 truncate">{location.fullAddress}</p>}
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
            <p className="text-[10px] text-slate-600">📡 Bağlantı</p>
            <p className="text-xs font-medium text-slate-300">{apiStatus === 'live' ? '🟢 Canlı Veri' : '📋 Önizleme'}</p>
          </div>
        </div>

        {/* Versiyon — gizli admin tetikleyici */}
        <button onClick={() => {
          adminTapsRef.current++;
          if (adminTapsRef.current >= 5) { setAdminOpen(true); adminTapsRef.current = 0; }
          else if (adminTapsRef.current >= 3) showToast(`${5 - adminTapsRef.current}...`);
          setTimeout(() => { adminTapsRef.current = 0; }, 2000);
        }} className="w-full py-3 text-center">
          <p className="text-[9px] text-slate-700">KampanyaRadarı v1.0 • TÜBİTAK Veri</p>
        </button>
      </div>
    );
  };

  // ─── RENDER ───
  return (
    <div className="mx-auto max-w-5xl">
      {/* Top nav — sadece desktop */}
      <div className="sticky top-0 z-40 -mx-4 mb-4 border-b border-slate-800 bg-slate-950/80 px-4 py-2 backdrop-blur-xl hidden sm:block">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <button onClick={() => setView('home')} className="flex items-center gap-2 font-extrabold text-emerald-400">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600"><Zap size={14} className="text-white" /></div>
            <span className="text-sm">KampanyaRadarı</span>
          </button>
          <div className="flex gap-1">
            {[
              { v: 'home' as ViewMode, label: 'Keşfet', icon: <Search size={13} /> },
              { v: 'cart' as ViewMode, label: `Sepet${needItems.length > 0 ? ` (${needItems.length})` : ''}`, icon: <ShoppingCart size={13} /> },
              { v: 'compare' as ViewMode, label: 'Karşılaştır', icon: <ArrowDownUp size={13} /> },
              { v: 'profile' as ViewMode, label: 'Profil', icon: <User size={13} /> },
            ].map((btn) => (
              <button key={btn.v} onClick={() => setView(btn.v)}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${view === btn.v ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                {btn.icon}{btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'home' && renderHome()}
      {view === 'cart' && renderCart()}
      {view === 'compare' && renderCompare()}
      {view === 'profile' && renderProfile()}

      <DetailModal />

      {/* Admin Panel */}
      <AdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        settings={adminSettings}
        setSettings={setAdminSettings}
        analytics={analyticsData}
        onResetAnalytics={resetAnalytics}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-slate-200 shadow-2xl">{toast}</div>
        </div>
      )}

      {/* Onboarding */}
      {!hasSeenOnboarding && allProducts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setHasSeenOnboarding(true)}>
          <div className="mx-4 max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 text-center animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <p className="text-4xl mb-3">🛒</p>
            <h2 className="text-lg font-extrabold text-slate-100 mb-2">KampanyaRadarı</h2>
            <p className="text-xs text-slate-400 mb-4">6 marketten gerçek zamanlı fiyat karşılaştırması. En ucuz sepeti otomatik bul.</p>
            <button onClick={() => setHasSeenOnboarding(true)} className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white">Başla →</button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl sm:hidden pb-safe">
        <div className="flex justify-around py-1.5">
          {[
            { v: 'home' as ViewMode, icon: '🏠', label: 'Keşfet' },
            { v: 'cart' as ViewMode, icon: '🛒', label: 'Sepet' },
            { v: 'compare' as ViewMode, icon: '⚖️', label: 'Karşılaştır' },
            { v: 'profile' as ViewMode, icon: '👤', label: 'Profil' },
          ].map((btn) => (
            <button key={btn.v} onClick={() => setView(btn.v)} className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-all active:scale-90 ${view === btn.v ? 'text-emerald-400' : 'text-slate-600'}`}>
              <span className="text-lg">{btn.icon}</span>
              <span className="text-[9px] font-medium">{btn.label}</span>
              {btn.v === 'cart' && needItems.length > 0 && <span className="absolute -top-0.5 right-0 h-2 w-2 rounded-full bg-violet-500" />}
            </button>
          ))}
        </div>
      </div>
      <div className="h-20 sm:hidden" /> {/* Bottom nav spacer */}
    </div>
  );
}
