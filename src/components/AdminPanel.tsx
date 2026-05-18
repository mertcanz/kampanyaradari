import { useState } from 'react';
import { X, BarChart3, Settings2, TrendingUp } from 'lucide-react';
import { usePersistedState } from '../hooks/usePersistedState';

// ─── Admin ayarları (tüm uygulamada kullanılır) ───

export interface AdminSettings {
  showAds: boolean;
  showAffiliate: boolean;
  showOnlineOrder: boolean;
  adsBanner: boolean;
  adsNative: boolean;
  adsBetween: boolean;
}

const defaultSettings: AdminSettings = {
  showAds: true,
  showAffiliate: true,
  showOnlineOrder: true,
  adsBanner: true,
  adsNative: true,
  adsBetween: true,
};

export function useAdminSettings() {
  const [settings, setSettings] = usePersistedState<AdminSettings>('admin_settings', defaultSettings);
  return { settings, setSettings };
}

// ─── Analytics tracker ───

export interface AnalyticsData {
  pageViews: number;
  searches: number;
  productClicks: number;
  affiliateClicks: number;
  adImpressions: number;
  optimizations: number;
  favoriteAdds: number;
  alarmSets: number;
  shareClicks: number;
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

// ─── Admin Panel Component ───

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AdminSettings;
  setSettings: (s: AdminSettings | ((prev: AdminSettings) => AdminSettings)) => void;
  analytics: AnalyticsData;
  onResetAnalytics: () => void;
}

export default function AdminPanel({ isOpen, onClose, settings, setSettings, analytics, onResetAnalytics }: AdminPanelProps) {
  const [tab, setTab] = useState<'settings' | 'analytics'>('analytics');

  if (!isOpen) return null;

  const toggle = (key: keyof AdminSettings) => {
    setSettings((prev: AdminSettings) => ({ ...prev, [key]: !prev[key] }));
  };

  const daysSinceReset = Math.max(1, Math.ceil((Date.now() - new Date(analytics.lastReset).getTime()) / 86400000));

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-900 max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Settings2 size={18} className="text-violet-400" />
            <h2 className="text-sm font-bold text-slate-200">Yönetim Paneli</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white"><X size={14} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800">
          <button onClick={() => setTab('analytics')} className={`flex-1 py-2.5 text-xs font-medium transition-all ${tab === 'analytics' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-500'}`}>
            <BarChart3 size={14} className="inline mr-1" /> Analiz
          </button>
          <button onClick={() => setTab('settings')} className={`flex-1 py-2.5 text-xs font-medium transition-all ${tab === 'settings' ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-500'}`}>
            <Settings2 size={14} className="inline mr-1" /> Ayarlar
          </button>
        </div>

        <div className="p-4 space-y-4">
          {tab === 'analytics' ? (
            <>
              {/* Özet kartlar */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Görüntüleme', value: analytics.pageViews, icon: '👁️', color: 'text-blue-400' },
                  { label: 'Arama', value: analytics.searches, icon: '🔍', color: 'text-emerald-400' },
                  { label: 'Ürün Tıklama', value: analytics.productClicks, icon: '👆', color: 'text-amber-400' },
                  { label: 'Affiliate', value: analytics.affiliateClicks, icon: '🔗', color: 'text-violet-400' },
                  { label: 'Reklam', value: analytics.adImpressions, icon: '📢', color: 'text-pink-400' },
                  { label: 'Optimize', value: analytics.optimizations, icon: '🧠', color: 'text-cyan-400' },
                  { label: 'Favori', value: analytics.favoriteAdds, icon: '❤️', color: 'text-red-400' },
                  { label: 'Alarm', value: analytics.alarmSets, icon: '🔔', color: 'text-amber-400' },
                  { label: 'Paylaşma', value: analytics.shareClicks, icon: '📤', color: 'text-sky-400' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-2.5 text-center">
                    <p className="text-sm">{s.icon}</p>
                    <p className={`text-base font-extrabold ${s.color}`}>{s.value}</p>
                    <p className="text-[8px] text-slate-600">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Günlük ortalama */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
                <h3 className="text-[10px] font-bold text-slate-500 mb-2"><TrendingUp size={12} className="inline mr-1" />Günlük Ortalama ({daysSinceReset} gün)</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Görüntüleme/gün</span><span className="text-slate-300 font-bold">{(analytics.pageViews / daysSinceReset).toFixed(1)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Arama/gün</span><span className="text-slate-300 font-bold">{(analytics.searches / daysSinceReset).toFixed(1)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Affiliate CTR</span><span className="text-violet-400 font-bold">{analytics.productClicks > 0 ? ((analytics.affiliateClicks / analytics.productClicks) * 100).toFixed(1) : '0'}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Dönüşüm</span><span className="text-emerald-400 font-bold">{analytics.pageViews > 0 ? ((analytics.optimizations / analytics.pageViews) * 100).toFixed(1) : '0'}%</span></div>
                </div>
              </div>

              {/* Tahmini gelir */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <h3 className="text-[10px] font-bold text-emerald-500 mb-2">💰 Tahmini Gelir</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">AdSense (₺0.50/1K gösterim)</span><span className="text-emerald-400 font-bold">₺{((analytics.adImpressions / 1000) * 0.5).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Affiliate (₺2/tıklama)</span><span className="text-emerald-400 font-bold">₺{(analytics.affiliateClicks * 2).toFixed(2)}</span></div>
                  <div className="flex justify-between border-t border-slate-800 pt-1 mt-1"><span className="text-slate-400 font-medium">Toplam</span><span className="text-emerald-400 font-extrabold">₺{(((analytics.adImpressions / 1000) * 0.5) + (analytics.affiliateClicks * 2)).toFixed(2)}</span></div>
                </div>
              </div>

              <button onClick={onResetAnalytics} className="w-full rounded-xl border border-red-500/30 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-all">Verileri Sıfırla</button>
            </>
          ) : (
            <>
              {/* Reklam kontrolleri */}
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-slate-500 mb-2">📢 Reklam Gösterimi</h3>
                {[
                  { key: 'showAds' as const, label: 'Tüm reklamlar', desc: 'Ana açma/kapama' },
                  { key: 'adsBanner' as const, label: 'Banner reklamlar', desc: 'Sayfalar arası büyük reklam' },
                  { key: 'adsNative' as const, label: 'Native reklamlar', desc: 'Ürün listesi içi reklam' },
                  { key: 'adsBetween' as const, label: 'Araya giren reklamlar', desc: 'Bölümler arası' },
                ].map((item) => (
                  <button key={item.key} onClick={() => toggle(item.key)} className="flex w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 text-left transition-all hover:bg-slate-800">
                    <div>
                      <p className="text-xs font-medium text-slate-300">{item.label}</p>
                      <p className="text-[9px] text-slate-600">{item.desc}</p>
                    </div>
                    <div className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-all ${settings[item.key] ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      <div className={`h-5 w-5 rounded-full bg-white shadow transition-all ${settings[item.key] ? 'translate-x-5' : ''}`} />
                    </div>
                  </button>
                ))}
              </div>

              {/* Affiliate kontrolleri */}
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-slate-500 mb-2">🔗 Affiliate & Sipariş</h3>
                {[
                  { key: 'showAffiliate' as const, label: 'Affiliate linkleri', desc: 'Trendyol, Hepsiburada linkleri' },
                  { key: 'showOnlineOrder' as const, label: 'Online sipariş butonları', desc: 'Market sitelerine yönlendirme' },
                ].map((item) => (
                  <button key={item.key} onClick={() => toggle(item.key)} className="flex w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 text-left transition-all hover:bg-slate-800">
                    <div>
                      <p className="text-xs font-medium text-slate-300">{item.label}</p>
                      <p className="text-[9px] text-slate-600">{item.desc}</p>
                    </div>
                    <div className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-all ${settings[item.key] ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                      <div className={`h-5 w-5 rounded-full bg-white shadow transition-all ${settings[item.key] ? 'translate-x-5' : ''}`} />
                    </div>
                  </button>
                ))}
              </div>

              {/* Durum özeti */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-3">
                <h3 className="text-[10px] font-bold text-slate-500 mb-2">📋 Mevcut Durum</h3>
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center gap-2"><span className={settings.showAds ? 'text-emerald-400' : 'text-red-400'}>{settings.showAds ? '✅' : '❌'}</span><span className="text-slate-400">Reklamlar {settings.showAds ? 'açık' : 'kapalı'}</span></div>
                  <div className="flex items-center gap-2"><span className={settings.showAffiliate ? 'text-emerald-400' : 'text-red-400'}>{settings.showAffiliate ? '✅' : '❌'}</span><span className="text-slate-400">Affiliate {settings.showAffiliate ? 'açık' : 'kapalı'}</span></div>
                  <div className="flex items-center gap-2"><span className={settings.showOnlineOrder ? 'text-emerald-400' : 'text-red-400'}>{settings.showOnlineOrder ? '✅' : '❌'}</span><span className="text-slate-400">Online sipariş {settings.showOnlineOrder ? 'açık' : 'kapalı'}</span></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
