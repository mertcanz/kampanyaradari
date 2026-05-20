export default function handler(req, res) {
  const base = 'https://kampanyaradari.vercel.app';
  const today = new Date().toISOString().split('T')[0];

  const products = ['süt', 'yumurta', 'domates', 'ekmek', 'tavuk', 'peynir', 'makarna', 'pirinç', 'bulgur', 'deterjan', 'şampuan', 'çay', 'kahve', 'şeker', 'tuz', 'zeytinyağı', 'ayçiçek yağı', 'zeytin', 'bal', 'reçel', 'sucuk', 'yoğurt', 'tereyağı', 'salça', 'ketçap', 'mercimek', 'patates', 'soğan', 'muz', 'elma', 'portakal', 'çikolata', 'bisküvi', 'cips', 'dondurma'];
  const categories = ['sut', 'peynir', 'yumurta', 'tereyag', 'et', 'balik', 'sebze', 'meyve', 'temel', 'yag', 'ekmek', 'kahvalti', 'icecek', 'konserve', 'atistirma', 'dondurma', 'temizlik', 'bakim', 'bebek', 'kuruyemis'];
  const marketIds = ['a101', 'bim', 'sok', 'migros', 'carrefour', 'tarim_kredi'];

  const urls = [
    { loc: `${base}/`, priority: '1.0', freq: 'daily' },
    { loc: `${base}/#/sepet`, priority: '0.8', freq: 'weekly' },
    { loc: `${base}/#/karsilastir`, priority: '0.8', freq: 'daily' },
    { loc: `${base}/#/profil`, priority: '0.5', freq: 'weekly' },
    ...products.map((p) => ({ loc: `${base}/#/urun/${encodeURIComponent(p)}`, priority: '0.9', freq: 'daily' })),
    ...categories.map((c) => ({ loc: `${base}/#/kategori/${c}`, priority: '0.8', freq: 'daily' })),
    ...marketIds.map((m) => ({ loc: `${base}/#/market/${m}`, priority: '0.7', freq: 'daily' })),
  ];

  res.setHeader('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
    <lastmod>${today}</lastmod>
  </url>`).join('\n')}
</urlset>`);
}
