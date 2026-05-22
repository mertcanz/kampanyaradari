// api/health.js — TÜBİTAK API bağlantısını test et
// Tarayıcıdan: https://kampanyaradari.vercel.app/api/health

const TUBITAK_API = 'https://api.marketfiyati.org.tr/api/v2';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const checks = {};

  // 1. TÜBİTAK API erişim testi
  try {
    const r = await fetch(`${TUBITAK_API}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'KampanyaRadari/1.0' },
      body: JSON.stringify({
        keywords: 'süt',
        latitude: 41.0082,
        longitude: 28.9784,
        distance: 5,
        size: 3,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const text = await r.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { /**/ }

    checks.tubitak = {
      status: r.status,
      ok: r.ok,
      // İlk 500 karakter — tam yanıtı görmek için
      responsePreview: text.slice(0, 500),
      // Beklenen alan var mı?
      hasContent: Array.isArray(parsed?.content),
      contentLength: parsed?.content?.length ?? null,
      numberOfFound: parsed?.numberOfFound ?? null,
    };
  } catch (e) {
    checks.tubitak = { error: e.message };
  }

  return res.json({
    ok: checks.tubitak?.ok === true,
    timestamp: new Date().toISOString(),
    checks,
  });
}
