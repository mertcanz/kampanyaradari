// ─── Supabase Entegrasyonu ───

const SUPABASE_URL = 'https://jczjzxudgiythbsildjf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_PvorYpEq_9HbLej2kytqmg_wlXvLyy4';
const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// ─── REST Client ───

async function db(table: string, method: string, body?: unknown, query = '') {
  if (!isConfigured) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
    const headers: Record<string, string> = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
    if (method === 'POST') headers['Prefer'] = 'return=representation';

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { console.warn(`Supabase ${method} ${table}: ${res.status}`); return null; }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    console.warn('Supabase hatası:', err);
    return null;
  }
}

// ─── Topluluk Fiyat Bildirimleri ───

export interface CommunityPrice {
  id?: string;
  product_name: string;
  market_id: string;
  price: number;
  username: string;
  city: string;
  upvotes: number;
  verified: boolean;
  created_at?: string;
}

export async function submitCommunityPrice(data: {
  product_name: string; market_id: string; price: number; username: string; city: string;
}): Promise<CommunityPrice | null> {
  const result = await db('radar_community_prices', 'POST', {
    ...data, upvotes: 0, verified: false,
  });
  return result?.[0] || null;
}

export async function getCommunityPrices(limit = 30): Promise<CommunityPrice[]> {
  const result = await db('radar_community_prices', 'GET', undefined,
    `?order=created_at.desc&limit=${limit}`);
  return result || [];
}

export async function upvoteCommunityPrice(id: string): Promise<boolean> {
  const result = await db('rpc/radar_upvote_price', 'POST', { price_id: id });
  return result !== null;
}

// ─── Analytics ───

export async function trackSupabaseEvent(event: string, meta?: Record<string, unknown>): Promise<void> {
  await db('radar_analytics', 'POST', {
    event_name: event,
    meta: meta || {},
    page_url: window.location.href,
    user_agent: navigator.userAgent.slice(0, 200),
  });
}

export async function getAnalyticsSummary(): Promise<Record<string, number> | null> {
  const result = await db('rpc/radar_analytics_summary', 'POST', {});
  return result;
}

// ─── Fiyat Geçmişi (global) ───

export async function savePriceSnapshot(data: {
  product_name: string; market_id: string; price: number; city: string;
}): Promise<void> {
  await db('radar_price_history', 'POST', data);
}

export async function getPriceHistory(productName: string, days = 30): Promise<Array<{
  price: number; market_id: string; created_at: string;
}>> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const result = await db('radar_price_history', 'GET', undefined,
    `?product_name=eq.${encodeURIComponent(productName)}&created_at=gte.${since}&order=created_at.asc&limit=100`);
  return result || [];
}

// ─── Durum ───

export function isSupabaseReady(): boolean {
  return isConfigured;
}

/*
═══════════════════════════════════════════════
  SUPABASE SQL — SQL Editor'da çalıştır
═══════════════════════════════════════════════

-- Topluluk fiyat bildirimleri
CREATE TABLE radar_community_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  market_id TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  username TEXT DEFAULT 'Anonim',
  city TEXT DEFAULT '',
  upvotes INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Analytics olayları
CREATE TABLE radar_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  page_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fiyat geçmişi (global)
CREATE TABLE radar_price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  market_id TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  city TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Upvote fonksiyonu
CREATE OR REPLACE FUNCTION radar_upvote_price(price_id UUID)
RETURNS void AS $$
  UPDATE radar_community_prices
  SET upvotes = upvotes + 1,
      verified = CASE WHEN upvotes + 1 >= 3 THEN true ELSE verified END
  WHERE id = price_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Analytics özet fonksiyonu
CREATE OR REPLACE FUNCTION radar_analytics_summary()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_events', COUNT(*),
    'today', COUNT(*) FILTER (WHERE created_at > now() - interval '1 day'),
    'searches', COUNT(*) FILTER (WHERE event_name = 'search'),
    'product_clicks', COUNT(*) FILTER (WHERE event_name = 'product_click'),
    'affiliate_clicks', COUNT(*) FILTER (WHERE event_name = 'affiliate_click'),
    'optimizations', COUNT(*) FILTER (WHERE event_name = 'optimization'),
    'favorites', COUNT(*) FILTER (WHERE event_name = 'favorite'),
    'alarms', COUNT(*) FILTER (WHERE event_name = 'alarm')
  ) FROM radar_analytics;
$$ LANGUAGE SQL SECURITY DEFINER;

-- İndeksler (performans)
CREATE INDEX idx_radar_prices_product ON radar_price_history(product_name);
CREATE INDEX idx_radar_prices_date ON radar_price_history(created_at);
CREATE INDEX idx_radar_analytics_event ON radar_analytics(event_name);
CREATE INDEX idx_radar_analytics_date ON radar_analytics(created_at);
CREATE INDEX idx_radar_community_date ON radar_community_prices(created_at);

-- RLS (Row Level Security)
ALTER TABLE radar_community_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "radar_community_read" ON radar_community_prices FOR SELECT USING (true);
CREATE POLICY "radar_community_insert" ON radar_community_prices FOR INSERT WITH CHECK (true);

ALTER TABLE radar_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "radar_analytics_insert" ON radar_analytics FOR INSERT WITH CHECK (true);

ALTER TABLE radar_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "radar_history_read" ON radar_price_history FOR SELECT USING (true);
CREATE POLICY "radar_history_insert" ON radar_price_history FOR INSERT WITH CHECK (true);

*/
