const TUBITAK_API = 'https://api.marketfiyati.org.tr/api/v2';
const cache = {};
const CACHE_TTL = 30 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q = '', lat = '41.0082', lon = '28.9784', distance = '5' } = req.query;

  if (!q.trim()) {
    return res.status(400).json({ error: 'q parametresi zorunlu' });
  }

  const key = `c:${q}:${lat}:${lon}:${distance}`;

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
        size: 50,
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

  // TÜBİTAK response yapısı: { content: [...], numberOfFound: N }
  // Her item içinde productDepotInfoList dizisi var (market + fiyat bilgisi)
  const content = data.content || [];

  // Market bazında gruplama: { marketAdi -> [{ product, depot }] }
  const byMarket = {};
  for (const item of content) {
    const depots = item.productDepotInfoList || [];
    for (const depot of depots) {
      const marketName = depot.marketAdi || 'Bilinmeyen';
      if (!byMarket[marketName]) byMarket[marketName] = [];
      byMarket[marketName].push({
        id: item.id,
        title: item.title,
        brand: item.brand,
        category: item.main_category,
        unit: item.refinedVolumeOrWeight,
        imageUrl: item.imageUrl,
        price: depot.price,
        unitPrice: depot.unitPrice,
        discount: depot.discount,
        discountRatio: depot.discountRatio,
        promotionText: depot.promotionText,
        depotName: depot.depotName,
        depotId: depot.depotId,
        indexTime: depot.indexTime,
      });
    }
  }

  const result = {
    query: q,
    numberOfFound: data.numberOfFound || content.length,
    byMarket,
    content,
  };

  cache[key] = { data: result, ts: Date.now() };
  return res.json({ ...result, cached: false });
}
