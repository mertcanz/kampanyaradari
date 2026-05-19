// ─── SEO Helpers ───

const BASE_TITLE = 'KampanyaRadarı';
const BASE_DESC = 'A101, BİM, ŞOK, Migros fiyatlarını karşılaştır. En ucuz market fiyatları.';

export function updatePageMeta(title: string, description?: string) {
  document.title = `${title} | ${BASE_TITLE}`;

  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta) descMeta.setAttribute('content', description || BASE_DESC);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', description || BASE_DESC);
}

export const pageMeta: Record<string, { title: string; desc: string }> = {
  home: {
    title: 'En Ucuz Market Fiyatları',
    desc: 'Çevrenizdeki A101, BİM, ŞOK, Migros, CarrefourSA fiyatlarını karşılaştırın.',
  },
  cart: {
    title: 'Akıllı Sepet — En Ucuz Alışveriş Planı',
    desc: 'İhtiyaç listesi oluşturun, otomatik olarak en ucuz market planını bulun.',
  },
  compare: {
    title: 'Fiyat Karşılaştırma',
    desc: 'Aynı ürünü farklı marketlerde karşılaştırın. En ucuzunu bulun.',
  },
  profile: {
    title: 'Profilim',
    desc: 'Favorileriniz, fiyat alarmlarınız ve alışveriş istatistikleriniz.',
  },
};
