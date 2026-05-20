import { useState } from 'react';
import { X, BarChart3, Settings2, TrendingUp, DollarSign, Globe } from 'lucide-react';
import { usePersistedState } from '../hooks/usePersistedState';

// ─── Admin ayarları ───

export interface AdminSettings {
  // Reklam
  showAds: boolean;
  adsBanner: boolean;
  adsNative: boolean;
  // Affiliate
  showAffiliate: boolean;
  showOnlineOrder: boolean;
  affiliateTrendyolId: string;
  affiliateHBId: string;
  // Premium
  premiumEnabled: boolean;
  premiumPrice: string;
  // Sponsorlu
  sponsoredMarket: string; // hangi market sponsorlu gösterilsin
  sponsoredMessage: string;
  // SEO
  seoAutoPages: boolean;
}

const defaultSettings: AdminSettings = {
  showAds: true, adsBanner: true, adsNative: true,
  showAffiliate: true, showOnlineOrder: true,
  affiliateTrendyolId: '', affiliateHBId: '',
  premiumEnabled: false, premiumPrice: '29.90',
  sponsoredMarket: '', sponsoredMessage: '',
  seoAutoPages: true,
};

export function useAdminSettings() {
  const [settings, setSettings] = usePersistedState<AdminSettings>('admin_settings_v2', defaultSettings);

  const updateSettings = (newSettings: AdminSettings | ((prev: AdminSettings) => AdminSettings)) => {
    setSettings(newSettings);
    try {
      const resolved = typeof newSettings === 'function' ? newSettings(settings) : newSettings;
      fetch('https://jczjzxudgiythbsildjf.supabase.co/rest/v1/radar_admin_settings?id=eq.1', {
        method: 'PATCH',
        headers: {
          'apikey': 'sb_publishable_PvorYpEq_9HbLej2kytqmg_wlXvLyy4',
          'Authorization': 'Bearer sb_publishable_PvorYpEq_9HbLej2kytqmg_wlXvLyy4',
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ settings: resolved }),
      }).catch(() => {});
    } catch { /**/ }
  };

  useState(() => {
    fetch('https://jczjzxudgiythbsildjf.supabase.co/rest/v1/radar_admin_settings?id=eq.1&select=settings', {
      headers: {
        'apikey': 'sb_publishable_PvorYpEq_9HbLej2kytqmg_wlXvLyy4',
        'Authorization': 'Bearer sb_publishable_PvorYpEq_9HbLej2kytqmg_wlXvLyy4',
      },
    }).then((r) => r.json()).then((data) => {
      if (data?.[0]?.settings) setSettings(data[0].settings);
    }).catch(() => {});
  });

  return { settings, setSettings: updateSettings };
}

// ─── Analytics ───

export interface AnalyticsData {
  pageViews: number; searches: number; productClicks: number;
  affiliateClicks: number; adImpressions: number; optimizations: number;
  favoriteAdds: number; alarmSets: number; shareClicks: number;
  lastReset: string;
}

const defaultAnalytics: AnalyticsData = {
  pageViews: 0, searches: 0, productClicks: 0, affiliateClicks: 0,
  adImpressions: 0, optimizations: 0, favoriteAdds: 0, alarmSets: 0,
  shareClicks: 0, lastReset: new Date().toISOString(),
};

export function useAnalytics() {
  const [data, setData] = usePersistedState<AnalyticsData>('analytics_data', defaultAnalytics);
  const track = (event: keyof Omit<AnalyticsData, 'lastReset'>) => {
    setData((prev: AnalyticsData) => ({ ...prev, [event]: (prev[event] as number) + 1 }));
  };
  const reset = () => setData({ ...defaultAnalytics, lastReset: new Date().toISOString() });
  return { data, track, reset };
}

// ─── Panel ───

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AdminSettings;
  setSettings: (s: AdminSettings | ((prev: AdminSettings) => AdminSettings)) => void;
  analytics: AnalyticsData;
  onResetAnalytics: () => void;
}

export default function AdminPanel({ isOpen, onClose, settings, setSettings, analytics, onResetAnalytics }: AdminPanelProps) {
  const [tab, setTab] = useState<'analytics' | 'revenue' | 'seo'>('analytics');
  if (!isOpen) return null;

  const toggle = (key: keyof AdminSettings) => {
    setSettings((prev: AdminSettings) => ({ ...prev, [key]: !prev[key] }));
  };
  const setText = (key: keyof AdminSettings, val: string) => {
    setSettings((prev: AdminSettings) => ({ ...prev, [key]: val }));
  };

  const days = Math.max(1, Math.ceil((Date.now() - new Date(analytics.lastReset).getTime()) / 86400000));
  const estRevenue = ((analytics.adImpressions / 1000) * 0.5) + (analytics.affiliateClicks * 2);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-900 max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2"><Settings2 size={18} className="text-violet-400" /><h2 className="text-sm font-bold text-slate-200">Yönetim Paneli</h2></div>
          <button onClick={onClose} className="rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white"><X size={14} /></button>
        </div>

        <div className="flex border-b border-slate-800">
          {[
            { id: 'analytics' as const, icon: <BarChart3 size={13} />, label: 'Analiz' },
            { id: 'revenue' as const, icon: <DollarSign size={13} />, label: 'Gelir' },
            { id: 'seo' as const, icon: <Globe size={13} />, label: 'SEO' },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-all ${tab === t.id ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-500'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {tab === 'analytics' && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: 'Görüntüleme', v: analytics.pageViews, e: '👁️', c: 'text-blue-400' },
                  { l: 'Arama', v: analytics.searches, e: '🔍', c: 'text-emerald-400' },
                  { l: 'Ürün Tık', v: analytics.productClicks, e: '👆', c: 'text-amber-400' },
                  { l: 'Affiliate', v: analytics.affiliateClicks, e: '🔗', c: 'text-violet-400' },
                  { l: 'Optimize', v: analytics.optimizations, e: '🧠', c: 'text-cyan-400' },
                  { l: 'Paylaşma', v: analytics.shareClicks, e: '📤', c: 'text-sky-400' },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-2 text-center">
                    <p className="text-sm">{s.e}</p><p className={`text-base font-extrabold ${s.c}`}>{s.v}</p><p className="text-[8px] text-slate-600">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 text-xs space-y-1">
                <p className="font-bold text-slate-500"><TrendingUp size={12} className="inline mr-1" />Günlük Ort. ({days} gün)</p>
                <div className="flex justify-between"><span className="text-slate-500">Görüntüleme/gün</span><span className="text-slate-300">{(analytics.pageViews / days).toFixed(1)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Affiliate CTR</span><span className="text-violet-400">{analytics.productClicks > 0 ? ((analytics.affiliateClicks / analytics.productClicks) * 100).toFixed(1) : '0'}%</span></div>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                <p className="font-bold text-emerald-500 mb-1">💰 Tahmini Gelir</p>
                <div className="flex justify-between"><span className="text-slate-500">AdSense</span><span className="text-emerald-400">₺{((analytics.adImpressions / 1000) * 0.5).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Affiliate</span><span className="text-emerald-400">₺{(analytics.affiliateClicks * 2).toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-slate-800 pt-1 mt-1"><span className="text-slate-400">Toplam</span><span className="text-emerald-400 font-bold">₺{estRevenue.toFixed(2)}</span></div>
              </div>
              <button onClick={onResetAnalytics} className="w-full rounded-xl border border-red-500/30 py-2 text-xs text-red-400 hover:bg-red-500/10">Sıfırla</button>
            </>
          )}

          {tab === 'revenue' && (
            <>
              {/* Reklam */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500">📢 Reklamlar</p>
                {[
                  { key: 'showAds' as const, label: 'Tüm reklamlar' },
                  { key: 'adsBanner' as const, label: 'Banner' },
                  { key: 'adsNative' as const, label: 'Native (liste içi)' },
                ].map((item) => (
                  <button key={item.key} onClick={() => toggle(item.key)} className="flex w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
                    <span className="text-xs text-slate-300">{item.label}</span>
                    <div className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-all ${settings[item.key] ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      <div className={`h-4 w-4 rounded-full bg-white shadow transition-all ${settings[item.key] ? 'translate-x-4' : ''}`} />
                    </div>
                  </button>
                ))}
              </div>

              {/* Affiliate */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500">🔗 Affiliate & Sipariş</p>
                {[
                  { key: 'showAffiliate' as const, label: 'Affiliate linkler (Trendyol/HB)' },
                  { key: 'showOnlineOrder' as const, label: 'Online sipariş butonları' },
                ].map((item) => (
                  <button key={item.key} onClick={() => toggle(item.key)} className="flex w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
                    <span className="text-xs text-slate-300">{item.label}</span>
                    <div className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-all ${settings[item.key] ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      <div className={`h-4 w-4 rounded-full bg-white shadow transition-all ${settings[item.key] ? 'translate-x-4' : ''}`} />
                    </div>
                  </button>
                ))}
                <input type="text" placeholder="Trendyol Partner ID" value={settings.affiliateTrendyolId}
                  onChange={(e) => setText('affiliateTrendyolId', e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:border-violet-500 focus:outline-none" />
                <input type="text" placeholder="Hepsiburada Affiliate ID" value={settings.affiliateHBId}
                  onChange={(e) => setText('affiliateHBId', e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:border-violet-500 focus:outline-none" />
              </div>

              {/* Sponsorlu Market */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500">⭐ Sponsorlu Market</p>
                <select value={settings.sponsoredMarket} onChange={(e) => setText('sponsoredMarket', e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 focus:border-violet-500 focus:outline-none">
                  <option value="">Yok</option>
                  <option value="a101">A101</option>
                  <option value="bim">BİM</option>
                  <option value="sok">ŞOK</option>
                  <option value="migros">Migros</option>
                  <option value="carrefour">CarrefourSA</option>
                  <option value="tarim_kredi">Tarım Kredi</option>
                </select>
                <input type="text" placeholder="Sponsorlu mesaj (ör: Bu hafta A101'de süper fırsatlar!)" value={settings.sponsoredMessage}
                  onChange={(e) => setText('sponsoredMessage', e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:border-violet-500 focus:outline-none" />
              </div>

              {/* Premium */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500">💎 Premium Üyelik</p>
                <button onClick={() => toggle('premiumEnabled')} className="flex w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
                  <span className="text-xs text-slate-300">Premium aktif</span>
                  <div className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-all ${settings.premiumEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                    <div className={`h-4 w-4 rounded-full bg-white shadow transition-all ${settings.premiumEnabled ? 'translate-x-4' : ''}`} />
                  </div>
                </button>
                <input type="text" placeholder="Aylık fiyat (₺)" value={settings.premiumPrice}
                  onChange={(e) => setText('premiumPrice', e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:border-violet-500 focus:outline-none" />
              </div>

              {/* Durum */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 text-[10px] space-y-0.5">
                <p className="font-bold text-slate-500 mb-1">Mevcut Durum</p>
                {[
                  ['Reklamlar', settings.showAds],
                  ['Affiliate', settings.showAffiliate],
                  ['Online sipariş', settings.showOnlineOrder],
                  ['Sponsorlu', !!settings.sponsoredMarket],
                  ['Premium', settings.premiumEnabled],
                ].map(([label, active]) => (
                  <div key={label as string} className="flex items-center gap-2">
                    <span className={active ? 'text-emerald-400' : 'text-red-400'}>{active ? '✅' : '❌'}</span>
                    <span className="text-slate-400">{label as string}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'seo' && (
            <>
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
                <p className="text-xs font-bold text-slate-300 mb-2">🔍 SEO Durumu</p>
                <div className="space-y-1 text-[10px]">
                  {[
                    ['Title tag', true],
                    ['Meta description', true],
                    ['Open Graph', true],
                    ['Structured Data', true],
                    ['FAQ Schema', true],
                    ['Sitemap', true],
                    ['Robots.txt', true],
                    ['Noscript fallback', true],
                    ['Dinamik meta', true],
                    ['Preconnect', true],
                  ].map(([label]) => (
                    <div key={label as string} className="flex items-center gap-2">
                      <span className="text-emerald-400">✅</span>
                      <span className="text-slate-400">{label as string}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => toggle('seoAutoPages')} className="flex w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
                <div>
                  <span className="text-xs text-slate-300">SEO Landing Sayfaları</span>
                  <p className="text-[9px] text-slate-600">Ürün/kategori/market sayfaları</p>
                </div>
                <div className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-all ${settings.seoAutoPages ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                  <div className={`h-4 w-4 rounded-full bg-white shadow transition-all ${settings.seoAutoPages ? 'translate-x-4' : ''}`} />
                </div>
              </button>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
                <p className="font-bold mb-1">💡 SEO İpuçları</p>
                <ul className="space-y-0.5 text-[10px] text-slate-500">
                  <li>• Google Search Console'a siteyi ekleyin</li>
                  <li>• Sitemap'i Search Console'a gönderin</li>
                  <li>• Sosyal medyada paylaşarak backlink oluşturun</li>
                  <li>• Blog yazıları ile içerik derinliği artırın</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
