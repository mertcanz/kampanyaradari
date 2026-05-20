import { useState, useEffect } from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import { searchProducts, formatDistance, type MarketProduct } from '../api/market-api';
import { categories, markets } from '../data/markets';
import { setProductMeta, setCategoryMeta, setMarketMeta } from '../utils/seo';
import { setHash } from '../utils/router';

// ─── Ürün SEO Sayfası ───
// URL: /#/urun/domates
// Title: "Domates Fiyat Karşılaştırma — Hangi Markette Ucuz?"

export function ProductPage({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const name = decodeURIComponent(slug);

  useEffect(() => {
    setLoading(true);
    searchProducts(name, 30).then((r) => {
      setProducts(r);
      const cheapest = r.length > 0 ? r.sort((a, b) => a.price - b.price)[0] : null;
      setProductMeta(name, cheapest?.price, cheapest?.marketName);
      setLoading(false);
    });
  }, [name]);

  const grouped: Record<string, MarketProduct[]> = {};
  for (const p of products) { const k = p.name; if (!grouped[k]) grouped[k] = []; grouped[k].push(p); }
  const sorted = Object.entries(grouped).map(([n, items]) => ({ name: n, items: items.sort((a, b) => a.price - b.price) }));

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-[11px] text-slate-500">
        <button onClick={onBack} className="hover:text-emerald-400">Ana Sayfa</button>
        <ChevronRight size={10} />
        <span className="text-slate-300">Ürün</span>
        <ChevronRight size={10} />
        <span className="text-emerald-400">{name}</span>
      </div>

      {/* H1 */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-100">{name} Fiyat Karşılaştırma</h1>
        <p className="text-sm text-slate-500 mt-1">Hangi markette en ucuz? Tüm marketlerde {name.toLowerCase()} fiyatlarını karşılaştır.</p>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="skeleton h-16 w-full" />)}</div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
          <p className="text-slate-500">"{name}" için sonuç bulunamadı</p>
          <button onClick={onBack} className="mt-2 text-xs text-emerald-400 hover:underline">Ana sayfaya dön</button>
        </div>
      ) : (
        <>
          {sorted.map((group) => (
            <div key={group.name} className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
              <h2 className="text-sm font-bold text-slate-200 mb-3">{group.items[0]?.emoji} {group.name}</h2>
              {group.items.length > 1 && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500">En ucuz</p>
                    <p className="text-lg font-extrabold text-emerald-400">₺{group.items[0].price.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400">{group.items[0].marketLogo} {group.items[0].marketName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">Fark</p>
                    <p className="text-base font-bold text-amber-400">₺{(group.items[group.items.length - 1].price - group.items[0].price).toFixed(2)}</p>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                {group.items.map((p, i) => (
                  <div key={p.id} className={`flex items-center gap-2 rounded-lg p-2.5 ${i === 0 ? 'bg-emerald-500/5 border border-emerald-500/20' : ''}`}>
                    <span className="text-sm">{p.marketLogo}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-300">{p.marketName}</span>
                        {i === 0 && group.items.length > 1 && <span className="text-[8px] rounded-full bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 font-bold">EN UCUZ</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-600">
                        {p.depotName && <span>{p.depotName}</span>}
                        {p.distanceKm !== null && <span>📍 {formatDistance(p.distanceKm)}</span>}
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${i === 0 ? 'text-emerald-400' : 'text-slate-300'}`}>₺{p.price.toFixed(2)}</span>
                    <a href={p.depotLat && p.depotLon
                      ? `https://www.google.com/maps/dir/?api=1&destination=${p.depotLat},${p.depotLon}`
                      : `https://www.google.com/maps/search/${encodeURIComponent(p.marketName + ' ' + (p.depotName || ''))}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-700/50 text-slate-500 hover:text-emerald-400">
                      <MapPin size={12} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* SEO İçerik Bloğu */}
          <div className="rounded-xl border border-slate-700/30 bg-slate-800/30 p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-300">{name} Hangi Markette Daha Ucuz?</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              {name} fiyatları marketten markete farklılık gösterebilir. KampanyaRadarı ile A101, BİM, ŞOK, Migros ve CarrefourSA marketlerindeki 
              {name.toLowerCase()} fiyatlarını anında karşılaştırabilirsiniz. Konumunuza en yakın marketlerdeki güncel fiyatları görün ve en uygun fiyata alışveriş yapın.
            </p>
            <h3 className="text-xs font-bold text-slate-400">Sık Sorulan Sorular</h3>
            <details className="text-xs">
              <summary className="text-slate-400 cursor-pointer hover:text-slate-300">{name} en ucuz hangi markette?</summary>
              <p className="text-slate-600 mt-1 pl-3">
                {sorted[0]?.items[0] ? `Şu an en ucuz ${name.toLowerCase()} ₺${sorted[0].items[0].price.toFixed(2)} ile ${sorted[0].items[0].marketName}'de bulunmaktadır.` : `Güncel fiyatlar için yukarıdaki karşılaştırmayı inceleyin.`}
              </p>
            </details>
            <details className="text-xs">
              <summary className="text-slate-400 cursor-pointer hover:text-slate-300">{name} fiyatları ne kadar?</summary>
              <p className="text-slate-600 mt-1 pl-3">
                {name} fiyatları markete ve bölgeye göre değişir. {sorted[0]?.items.length ? `₺${sorted[0].items[0].price.toFixed(2)} ile ₺${sorted[0].items[sorted[0].items.length - 1].price.toFixed(2)} arasında değişmektedir.` : ''}
              </p>
            </details>
          </div>

          {/* İlgili aramalar */}
          <div>
            <p className="text-xs text-slate-500 mb-2">İlgili aramalar</p>
            <div className="flex flex-wrap gap-1.5">
              {['süt', 'yumurta', 'ekmek', 'peynir', 'tavuk', 'makarna'].filter((k) => k !== name.toLowerCase()).map((kw) => (
                <button key={kw} onClick={() => setHash({ page: 'product', slug: kw })} className="rounded-full border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-[11px] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30">
                  {kw}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Kategori SEO Sayfası ───

export function CategoryPage({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const category = categories.find((c) => c.id === slug);

  useEffect(() => {
    if (!category) return;
    setCategoryMeta(category.name, category.emoji);
    setLoading(true);
    Promise.all(category.searchTerms.slice(0, 3).map((kw) => searchProducts(kw, 10)))
      .then((results) => {
        const all = results.flat();
        const seen = new Set<string>();
        setProducts(all.filter((p) => { const k = `${p.name}-${p.marketId}`; if (seen.has(k)) return false; seen.add(k); return true; }));
        setLoading(false);
      });
  }, [slug]);

  if (!category) return <div className="p-8 text-center text-slate-500">Kategori bulunamadı</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 text-[11px] text-slate-500">
        <button onClick={onBack} className="hover:text-emerald-400">Ana Sayfa</button>
        <ChevronRight size={10} />
        <span className="text-emerald-400">{category.emoji} {category.name}</span>
      </div>

      <div>
        <h1 className="text-xl font-extrabold text-slate-100">{category.emoji} {category.name} Fiyatları</h1>
        <p className="text-sm text-slate-500 mt-1">{category.name} kategorisindeki ürünlerin market fiyatlarını karşılaştır.</p>
      </div>

      {/* Ürün linkleri */}
      <div className="flex flex-wrap gap-1.5">
        {category.searchTerms.map((kw) => (
          <button key={kw} onClick={() => setHash({ page: 'product', slug: kw })} className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-400 hover:bg-violet-500/20">
            {kw}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="skeleton h-14 w-full" />)}</div>
      ) : (
        <div className="space-y-1.5">
          {products.slice(0, 20).map((p) => (
            <button key={p.id} onClick={() => setHash({ page: 'product', slug: p.name })} className="flex w-full items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 text-left hover:bg-slate-800 hover:border-slate-600 transition-all">
              {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-11 w-11 rounded-xl object-cover bg-slate-700" loading="lazy" /> :
               <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-700 text-xl">{p.emoji}</div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-100 truncate">{p.name}</p>
                <p className="text-[10px] text-slate-500">{p.marketLogo} {p.marketName} {p.distanceKm !== null ? `· ${formatDistance(p.distanceKm)}` : ''}</p>
              </div>
              <span className="text-base font-extrabold text-emerald-400">₺{p.price.toFixed(2)}</span>
              <ChevronRight size={14} className="text-slate-600" />
            </button>
          ))}
        </div>
      )}

      {/* SEO İçerik */}
      <div className="rounded-xl border border-slate-700/30 bg-slate-800/30 p-4">
        <h2 className="text-sm font-bold text-slate-300 mb-2">{category.name} Fiyatları Hakkında</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {category.name} kategorisindeki ürünlerin güncel fiyatlarını A101, BİM, ŞOK, Migros ve CarrefourSA marketlerinde karşılaştırın. 
          Konumunuza göre en yakın marketlerdeki {category.name.toLowerCase()} fiyatlarını görün.
        </p>
      </div>

      {/* Diğer kategoriler */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Diğer kategoriler</p>
        <div className="flex flex-wrap gap-1.5">
          {categories.filter((c) => c.id !== slug).slice(0, 8).map((c) => (
            <button key={c.id} onClick={() => setHash({ page: 'category', slug: c.id })} className="rounded-full border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-[11px] text-slate-400 hover:text-emerald-400">
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Market SEO Sayfası ───

export function MarketPage({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const market = markets[slug];

  useEffect(() => {
    if (!market) return;
    setMarketMeta(market.name, market.logo);
    setLoading(true);
    Promise.all(['süt', 'ekmek', 'domates', 'yumurta'].map((kw) => searchProducts(kw, 8)))
      .then((results) => {
        const all = results.flat().filter((p) => p.marketId === slug);
        setProducts(all);
        setLoading(false);
      });
  }, [slug]);

  if (!market) return <div className="p-8 text-center text-slate-500">Market bulunamadı</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 text-[11px] text-slate-500">
        <button onClick={onBack} className="hover:text-emerald-400">Ana Sayfa</button>
        <ChevronRight size={10} />
        <span className="text-emerald-400">{market.logo} {market.name}</span>
      </div>

      <div className={`rounded-2xl bg-gradient-to-r ${market.gradient} p-5 text-white`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{market.logo}</span>
          <div>
            <h1 className="text-xl font-extrabold">{market.name} Fiyatları</h1>
            <p className="text-sm opacity-80">Güncel ürün fiyat listesi ve karşılaştırma</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="skeleton h-14 w-full" />)}</div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500">
          Bu yarıçapta {market.name} ürünü bulunamadı
        </div>
      ) : (
        <div className="space-y-1.5">
          {products.map((p) => (
            <button key={p.id} onClick={() => setHash({ page: 'product', slug: p.name })} className="flex w-full items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 text-left hover:bg-slate-800 transition-all">
              {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-11 w-11 rounded-xl object-cover bg-slate-700" loading="lazy" /> :
               <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-700 text-xl">{p.emoji}</div>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-100 truncate">{p.name}</p>
                <p className="text-[10px] text-slate-500">{p.unit} {p.distanceKm !== null ? `· ${formatDistance(p.distanceKm)}` : ''}</p>
              </div>
              <span className="text-base font-extrabold text-emerald-400">₺{p.price.toFixed(2)}</span>
              <ChevronRight size={14} className="text-slate-600" />
            </button>
          ))}
        </div>
      )}

      {/* SEO İçerik */}
      <div className="rounded-xl border border-slate-700/30 bg-slate-800/30 p-4">
        <h2 className="text-sm font-bold text-slate-300 mb-2">{market.name} Hakkında</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {market.name} marketindeki güncel ürün fiyatlarını görüntüleyin. Süt, ekmek, yumurta, peynir ve daha birçok ürünün 
          {market.name} fiyatlarını diğer marketlerle karşılaştırın.
        </p>
      </div>

      {/* Diğer marketler */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Diğer marketler</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(markets).filter((m) => m.id !== slug).map((m) => (
            <button key={m.id} onClick={() => setHash({ page: 'market', slug: m.id })} className="rounded-full border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-[11px] text-slate-400 hover:text-emerald-400">
              {m.logo} {m.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
