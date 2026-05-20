// ─── SEO Helpers ───

const BASE = 'KampanyaRadarı';

export function updatePageMeta(title: string, description?: string) {
  document.title = `${title} | ${BASE}`;
  const set = (sel: string, attr: string, val: string) => {
    const el = document.querySelector(sel);
    if (el) el.setAttribute(attr, val);
  };
  set('meta[name="description"]', 'content', description || '');
  set('meta[property="og:title"]', 'content', title);
  set('meta[property="og:description"]', 'content', description || '');
}

export const pageMeta: Record<string, { title: string; desc: string }> = {
  home: { title: 'En Ucuz Market Fiyatları', desc: 'Çevrenizdeki A101, BİM, ŞOK, Migros, CarrefourSA fiyatlarını karşılaştırın.' },
  cart: { title: 'Akıllı Sepet', desc: 'İhtiyaç listesi oluşturun, en ucuz market planını otomatik bulun.' },
  compare: { title: 'Fiyat Karşılaştırma', desc: 'Aynı ürünü farklı marketlerde karşılaştırın.' },
  profile: { title: 'Profilim', desc: 'Favorileriniz, alarmlarınız ve istatistikleriniz.' },
};

export function setProductMeta(name: string, cheapestPrice?: number, marketName?: string) {
  const title = `${name} Fiyat Karşılaştırma — Hangi Markette Ucuz?`;
  const price = cheapestPrice ? ` En ucuz ₺${cheapestPrice.toFixed(2)}` : '';
  const market = marketName ? ` ${marketName}'de.` : '';
  const desc = `${name} fiyatları A101, BİM, ŞOK, Migros marketlerinde karşılaştır.${price}${market} En uygun fiyatı bul.`;
  updatePageMeta(title, desc);
}

export function setCategoryMeta(name: string, emoji: string) {
  updatePageMeta(
    `${emoji} ${name} Fiyatları — Market Karşılaştırma`,
    `${name} kategorisindeki ürünlerin A101, BİM, ŞOK, Migros fiyatlarını karşılaştırın. En ucuz ${name.toLowerCase()} fiyatlarını bulun.`
  );
}

export function setMarketMeta(name: string, logo: string) {
  updatePageMeta(
    `${logo} ${name} Fiyatları — Güncel Ürün Fiyat Listesi`,
    `${name} marketindeki güncel ürün fiyatları. ${name} süt, ekmek, yumurta, peynir fiyatları. Diğer marketlerle karşılaştır.`
  );
}
