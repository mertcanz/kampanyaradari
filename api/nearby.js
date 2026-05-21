// Yakındaki gerçek market şubelerini OpenStreetMap'ten çek
const cache = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 saat

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat = '41.0082', lon = '28.9784', radius = '1000' } = req.query;
  const key = `${lat}:${lon}:${radius}`;

  if (cache[key] && Date.now() - cache[key].ts < CACHE_TTL) {
    return res.json({ ...cache[key].data, cached: true });
  }

  try {
    // Overpass API — gerçek market şubeleri (node/way/relation)
    const query = `[out:json][timeout:12];(
      node["shop"~"supermarket|convenience|grocery"](around:${radius},${lat},${lon});
      way["shop"~"supermarket|convenience|grocery"](around:${radius},${lat},${lon});
      relation["shop"~"supermarket|convenience|grocery"](around:${radius},${lat},${lon});
    );out center tags;`;

    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];

    let data = null;
    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(12000),
        });
        if (!r.ok) throw new Error(`Overpass ${r.status}`);
        data = await r.json();
        break;
      } catch (err) {
        lastError = err;
      }
    }
    if (!data) throw lastError || new Error('Overpass unavailable');

    const stores = (data.elements || []).map((el) => ({
      id: el.id,
      name: el.tags?.name || el.tags?.brand || 'Market',
      brand: el.tags?.brand || '',
      lat: el.lat || el.center?.lat,
      lon: el.lon || el.center?.lon,
      address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber'], el.tags?.['addr:suburb'], el.tags?.['addr:city']].filter(Boolean).join(', '),
      phone: el.tags?.phone || '',
      opening: el.tags?.opening_hours || '',
    })).filter((s) => s.lat && s.lon);

    const result = { stores, total: stores.length, radius: parseInt(radius) };
    cache[key] = { data: result, ts: Date.now() };
    res.json({ ...result, cached: false });
  } catch (e) {
    if (cache[key]) return res.json({ ...cache[key].data, cached: true, stale: true });
    res.status(500).json({ error: e.message, stores: [] });
  }
}
