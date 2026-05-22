// Yakındaki gerçek market şubelerini OpenStreetMap'ten çek
const cache = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 saat

// Overpass endpoint listesi — sırayla dene, biri tutarsa dur
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'KampanyaRadari/1.0 (kampanyaradari.vercel.app)',
  'Accept': 'application/json',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lat = '41.0082', lon = '28.9784', radius = '1000' } = req.query;
  const key = `${lat}:${lon}:${radius}`;

  if (cache[key] && Date.now() - cache[key].ts < CACHE_TTL) {
    return res.json({ ...cache[key].data, cached: true });
  }

  // Overpass QL — supermarket/bakkal/market node + way + relation
  const query = `[out:json][timeout:15];
(
  node["shop"~"supermarket|convenience|grocery|department_store"](around:${radius},${lat},${lon});
  way["shop"~"supermarket|convenience|grocery|department_store"](around:${radius},${lat},${lon});
  relation["shop"~"supermarket|convenience|grocery|department_store"](around:${radius},${lat},${lon});
);
out center tags;`;

  const body = `data=${encodeURIComponent(query)}`;

  let data = null;
  let lastError = null;

  for (const endpoint of ENDPOINTS) {
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: HEADERS,
        body,
        signal: AbortSignal.timeout(13000),
      });

      // 429 veya 406 → sonraki endpoint'i dene
      if (r.status === 429 || r.status === 406) {
        lastError = new Error(`${endpoint} → ${r.status}`);
        continue;
      }

      if (!r.ok) {
        lastError = new Error(`${endpoint} → HTTP ${r.status}`);
        continue;
      }

      data = await r.json();
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!data) {
    // Tüm endpoint'ler başarısız — stale cache varsa dön
    if (cache[key]) return res.json({ ...cache[key].data, cached: true, stale: true });
    // Yoksa boş liste dön (500 değil — UI tarafında opsiyonel feature)
    return res.json({ stores: [], total: 0, radius: parseInt(radius), error: lastError?.message });
  }

  const stores = (data.elements || [])
    .map((el) => ({
      id: el.id,
      name: el.tags?.name || el.tags?.brand || 'Market',
      brand: el.tags?.brand || '',
      lat: el.lat ?? el.center?.lat,
      lon: el.lon ?? el.center?.lon,
      address: [
        el.tags?.['addr:street'],
        el.tags?.['addr:housenumber'],
        el.tags?.['addr:suburb'],
        el.tags?.['addr:city'],
      ].filter(Boolean).join(', '),
      phone: el.tags?.phone || '',
      opening: el.tags?.opening_hours || '',
    }))
    .filter((s) => s.lat && s.lon);

  const result = { stores, total: stores.length, radius: parseInt(radius) };
  cache[key] = { data: result, ts: Date.now() };
  return res.json({ ...result, cached: false });
}
