// ─── api/product-image.js ───
// Ürün görseli bulucu: önce TÜBİTAK API'sinden gelir (market-api.ts içinde).
// Bu endpoint sadece imageUrl null olan ürünler için çağrılır.
//
// Kaynak önceliği:
//   1. Open Food Facts (ücretsiz, Türkçe ürünler dahil, paketli gıda güçlü)
//   2. Bulunamazsa null döner — UI emoji ile gösterir

const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_PRODUCT = 'https://world.openfoodfacts.org/api/v2/search';

// Serverless instance cache (cold start'ta sıfırlanır, production'da saatler boyu yaşar)
const cache = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 saat

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { name = '', brand = '' } = req.query;
  if (!name.trim()) return res.status(400).json({ error: 'name parametresi zorunlu' });

  // Arama sorgusu: "İçim Süt 1L"
  const query = [brand.trim(), name.trim()].filter(Boolean).join(' ');
  const key = `img:${query.toLowerCase().replace(/\s+/g, '_')}`;

  // Cache hit
  if (cache[key] && Date.now() - cache[key].ts < CACHE_TTL) {
    return res.json({ imageUrl: cache[key].url, source: cache[key].src, cached: true });
  }

  // ── 1. Open Food Facts (v2 search) ──────────────────────────────────────────
  // Türkçe ürün veritabanı içerir. Paketli gıda, içecek, süt ürünleri güçlü.
  try {
    const params = new URLSearchParams({
      search_terms: query,
      json: '1',
      page_size: '5',
      fields: 'product_name,brands,image_front_url,image_url,image_front_small_url',
      lc: 'tr',
    });

    const r = await fetch(`${OFF_SEARCH}?${params}`, {
      headers: { 'User-Agent': 'KampanyaRadari/1.0 (kampanyaradari.vercel.app)' },
      signal: AbortSignal.timeout(5000),
    });

    if (r.ok) {
      const data = await r.json();
      const products = data.products || [];

      for (const p of products) {
        // Büyük → küçük görsel tercihi (daha hızlı yüklensin)
        const img =
          p.image_front_small_url ||
          p.image_front_url ||
          p.image_url;

        if (img && img.startsWith('https')) {
          cache[key] = { url: img, src: 'openfoodfacts', ts: Date.now() };
          return res.json({ imageUrl: img, source: 'openfoodfacts', cached: false });
        }
      }
    }
  } catch { /* timeout veya network hatası — sonraki kaynağa geç */ }

  // ── 2. Open Food Facts (İngilizce/Global arama — markalı ürünler için) ──────
  // Bazı Türk markaları (Ülker, Dost, Pınar vb.) global veri tabanında da var
  if (brand.trim()) {
    try {
      const params = new URLSearchParams({
        search_terms: `${brand.trim()} ${name.trim()}`,
        json: '1',
        page_size: '3',
        fields: 'product_name,brands,image_front_url,image_front_small_url',
      });

      const r = await fetch(`${OFF_SEARCH}?${params}`, {
        headers: { 'User-Agent': 'KampanyaRadari/1.0 (kampanyaradari.vercel.app)' },
        signal: AbortSignal.timeout(4000),
      });

      if (r.ok) {
        const data = await r.json();
        const products = data.products || [];

        for (const p of products) {
          const img = p.image_front_small_url || p.image_front_url;
          if (img && img.startsWith('https')) {
            cache[key] = { url: img, src: 'openfoodfacts_global', ts: Date.now() };
            return res.json({ imageUrl: img, source: 'openfoodfacts_global', cached: false });
          }
        }
      }
    } catch { /* devam */ }
  }

  // ── Bulunamadı ───────────────────────────────────────────────────────────────
  cache[key] = { url: null, src: 'not_found', ts: Date.now() };
  return res.json({ imageUrl: null, source: 'not_found', cached: false });
}
