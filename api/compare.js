const TUBITAK_API = 'https://api.marketfiyati.org.tr/api/v2';
const cache = {};
const CACHE_TTL = 30 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q = '', lat = '41.0082', lon = '28.9784' } = req.query;
  const key = `c:${q}:${lat}:${lon}`;

  if (cache[key] && Date.now() - cache[key].ts < CACHE_TTL) {
    return res.json({ ...cache[key].data, cached: true });
  }

  try {
    const r = await fetch(`${TUBITAK_API}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'KampanyaRadari/1.0' },
      body: JSON.stringify({
        keywords: q,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        distance: 50,
        size: 50
      })
    });

    if (!r.ok) throw new Error(`API ${r.status}`);

    const data = await r.json();
    const products = data.products || data.items || [];

    const byMarket = {};
    for (const p of products) {
      const m = p.marketName || p.market || 'Bilinmeyen';
      if (!byMarket[m]) byMarket[m] = [];
      byMarket[m].push(p);
    }

    const result = { query: q, totalResults: products.length, byMarket, products };
    cache[key] = { data: result, ts: Date.now() };
    res.json({ ...result, cached: false });
  } catch (e) {
    if (cache[key]) return res.json({ ...cache[key].data, cached: true, stale: true });
    res.status(500).json({ error: e.message });
  }
}
