export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  res.json({
    status: 'ok',
    source: 'TÜBİTAK BİLGEM - marketfiyati.org.tr',
    timestamp: new Date().toISOString(),
    message: 'KampanyaRadarı Backend çalışıyor!'
  });
}
