// ─── Hash Router ───
// SPA'da SEO-dostu URL yapısı
// /#/urun/domates → ürün sayfası
// /#/kategori/sut-urunleri → kategori sayfası
// /#/market/bim → market sayfası

export interface Route {
  page: 'home' | 'cart' | 'compare' | 'profile' | 'product' | 'category' | 'market';
  slug?: string;
}

export function parseHash(): Route {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  if (!hash || hash === '/') return { page: 'home' };

  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'sepet') return { page: 'cart' };
  if (parts[0] === 'karsilastir') return { page: 'compare' };
  if (parts[0] === 'profil') return { page: 'profile' };
  if (parts[0] === 'urun' && parts[1]) return { page: 'product', slug: decodeURIComponent(parts[1]) };
  if (parts[0] === 'kategori' && parts[1]) return { page: 'category', slug: parts[1] };
  if (parts[0] === 'market' && parts[1]) return { page: 'market', slug: parts[1] };

  return { page: 'home' };
}

export function setHash(route: Route) {
  let hash = '#/';
  switch (route.page) {
    case 'home': hash = '#/'; break;
    case 'cart': hash = '#/sepet'; break;
    case 'compare': hash = '#/karsilastir'; break;
    case 'profile': hash = '#/profil'; break;
    case 'product': hash = `#/urun/${encodeURIComponent(route.slug || '')}`; break;
    case 'category': hash = `#/kategori/${route.slug || ''}`; break;
    case 'market': hash = `#/market/${route.slug || ''}`; break;
  }
  if (window.location.hash !== hash) {
    window.history.pushState(null, '', hash);
  }
}
