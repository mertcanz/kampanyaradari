const TUBITAK_API = 'https://api.marketfiyati.org.tr/api/v2';
const cache = {};
const CACHE_TTL = 30 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q = '', lat = '41.0082', lon = '28.9784', distance = '5', size = '50' } = req.query;

  if (!q.trim()) {
    return res.status(400).json({ error: 'q parametresi zorunlu' });
  }

  const key = `s:${q}:${lat}:${lon}:${distance}:${size}`;

  // Taze cache varsa doğrudan dön
  if (cache[key] && Date.now() - cache[key].ts < CACHE_TTL) {
    return res.json({ ...cache[key].data, cached: true });
  }

  let r;
  try {
    r = await fetch(`${TUBITAK_API}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'KampanyaRadari/1.0' },
      body: JSON.stringify({
        keywords: q,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        distance: parseInt(distance),
        size: parseInt(size),
      }),
    });
  } catch (e) {
    return res.status(502).json({ error: `TÜBİTAK API'ye ulaşılamadı: ${e.message}` });
  }

  if (!r.ok) {
    const body = await r.text().catch(() => '');
    return res.status(502).json({ error: `TÜBİTAK API hatası: HTTP ${r.status}`, detail: body });
  }

  const data = await r.json();
  cache[key] = { data, ts: Date.now() };
  return res.json({ ...data, cached: false, source: 'tubitak' });
}
