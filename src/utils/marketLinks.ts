// ─── Market Yönlendirme Linkleri ───
// Her market için online alışveriş / arama linki oluşturur
// Affiliate ID'leri sonradan eklenebilir

interface MarketLink {
  url: string;
  label: string;
  color: string;
  hasApp: boolean;
  appScheme?: string; // deep link
}

// Affiliate ID'leri (varsa buraya eklenir)
const AFFILIATE_IDS = {
  trendyol: '', // Trendyol partner ID
  hepsiburada: '', // HB affiliate ID
};

export function getMarketLink(marketId: string, productName: string): MarketLink | null {
  const q = encodeURIComponent(productName);

  const links: Record<string, MarketLink> = {
    migros: {
      url: `https://www.migros.com.tr/arama?q=${q}`,
      label: 'Migros Online',
      color: 'from-orange-500 to-orange-600',
      hasApp: true,
      appScheme: `migros://search?q=${q}`,
    },
    carrefour: {
      url: `https://www.carrefoursa.com/search?q=${q}`,
      label: 'CarrefourSA Online',
      color: 'from-sky-500 to-indigo-600',
      hasApp: true,
    },
    a101: {
      url: `https://www.a101.com.tr/arama/?q=${q}`,
      label: 'A101 Online',
      color: 'from-blue-500 to-blue-600',
      hasApp: true,
    },
    getir: {
      url: `https://getir.com/`,
      label: 'Getir\'den Al',
      color: 'from-purple-500 to-purple-600',
      hasApp: true,
      appScheme: `getir://search?q=${q}`,
    },
    sok: {
      url: `https://www.sokmarket.com.tr/arama?q=${q}`,
      label: 'ŞOK Online',
      color: 'from-yellow-500 to-orange-500',
      hasApp: false,
    },
    bim: {
      url: `https://www.bim.com.tr/`,
      label: 'BİM',
      color: 'from-red-500 to-red-600',
      hasApp: false,
    },
    tarim_kredi: {
      url: `https://www.tarimkredi.org.tr/`,
      label: 'Tarım Kredi',
      color: 'from-emerald-500 to-emerald-600',
      hasApp: false,
    },
  };

  return links[marketId] || null;
}

// Trendyol Market arama linki (affiliate destekli)
export function getTrendyolLink(productName: string): string {
  const q = encodeURIComponent(productName + ' market');
  const base = `https://www.trendyol.com/sr?q=${q}&qt=${q}&st=${q}&os=1`;
  return AFFILIATE_IDS.trendyol
    ? `${base}&boutiqueId=&merchantId=&sdg=&pi=&sst=&sk=&attributeId=&filterOverPriceListId=&sclId=&utm_source=affiliate&utm_medium=${AFFILIATE_IDS.trendyol}`
    : base;
}

// Hepsiburada Market arama
export function getHepsiburadaLink(productName: string): string {
  const q = encodeURIComponent(productName);
  return `https://www.hepsiburada.com/ara?q=${q}`;
}
