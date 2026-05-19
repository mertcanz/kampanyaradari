// ─── Minimal Simülasyon (sadece fallback) ───

import { type MarketId } from '../data/markets';

type CategoryType = string;

export interface LiveProduct {
  id: string;
  name: string;
  brand: string;
  category: CategoryType;
  emoji: string;
  unit: string;
  marketId: MarketId;
  basePrice: number;
  currentPrice: number;
}

interface Item { id: string; n: string; b: string; c: CategoryType; e: string; u: string; m: MarketId; p: number; }

const items: Item[] = [
  { id:'1', n:'Süt 1L', b:'İçim', c:'sut', e:'🥛', u:'adet', m:'a101', p:38.9 },
  { id:'2', n:'Süt 1L', b:'Pınar', c:'sut', e:'🥛', u:'adet', m:'bim', p:36.9 },
  { id:'3', n:'Süt 1L', b:'Sütaş', c:'sut', e:'🥛', u:'adet', m:'migros', p:41.9 },
  { id:'4', n:'Yumurta 15li', b:'Köy', c:'temel', e:'🥚', u:'paket', m:'a101', p:74.9 },
  { id:'5', n:'Yumurta 15li', b:'Hastavuk', c:'temel', e:'🥚', u:'paket', m:'bim', p:69.9 },
  { id:'6', n:'Yumurta 15li', b:'Çiftlik', c:'temel', e:'🥚', u:'paket', m:'sok', p:72.9 },
  { id:'7', n:'Domates', b:'Yerli', c:'sebze', e:'🍅', u:'kg', m:'a101', p:39.9 },
  { id:'8', n:'Domates', b:'Yerli', c:'sebze', e:'🍅', u:'kg', m:'bim', p:37.9 },
  { id:'9', n:'Domates', b:'Yerli', c:'sebze', e:'🍅', u:'kg', m:'sok', p:38.9 },
  { id:'10', n:'Domates', b:'Yerli', c:'sebze', e:'🍅', u:'kg', m:'migros', p:42.9 },
  { id:'11', n:'Ekmek', b:'Uno', c:'firin', e:'🍞', u:'adet', m:'a101', p:10 },
  { id:'12', n:'Ekmek', b:'Uno', c:'firin', e:'🍞', u:'adet', m:'bim', p:9.5 },
  { id:'13', n:'Tavuk Göğüs', b:'Banvit', c:'et', e:'🍗', u:'kg', m:'a101', p:159.9 },
  { id:'14', n:'Tavuk But', b:'Banvit', c:'et', e:'🍗', u:'kg', m:'bim', p:139.9 },
  { id:'15', n:'Tavuk Göğüs', b:'CP', c:'et', e:'🍗', u:'kg', m:'sok', p:164.9 },
  { id:'16', n:'Peynir Beyaz', b:'Tahsildaroğlu', c:'sut', e:'🧀', u:'kg', m:'a101', p:189.9 },
  { id:'17', n:'Peynir Beyaz', b:'Bahçıvan', c:'sut', e:'🧀', u:'kg', m:'bim', p:179.9 },
  { id:'18', n:'Peynir Beyaz', b:'Muratbey', c:'sut', e:'🧀', u:'kg', m:'sok', p:199.9 },
  { id:'19', n:'Makarna 500g', b:'Barilla', c:'temel', e:'🍝', u:'paket', m:'a101', p:21.9 },
  { id:'20', n:'Makarna 500g', b:'Filiz', c:'temel', e:'🍝', u:'paket', m:'bim', p:18.9 },
  { id:'21', n:'Deterjan 4kg', b:'Persil', c:'temizlik', e:'🧺', u:'paket', m:'a101', p:199.9 },
  { id:'22', n:'Deterjan 4kg', b:'Bingo', c:'temizlik', e:'🧺', u:'paket', m:'bim', p:149.9 },
  { id:'23', n:'Çay 1kg', b:'Doğuş', c:'icecek', e:'🍵', u:'paket', m:'a101', p:109.9 },
  { id:'24', n:'Çay 1kg', b:'Doğuş', c:'icecek', e:'🍵', u:'paket', m:'bim', p:104.9 },
  { id:'25', n:'Yoğurt 1kg', b:'Sütaş', c:'sut', e:'🥛', u:'adet', m:'a101', p:49.9 },
  { id:'26', n:'Yoğurt 1kg', b:'Sütaş', c:'sut', e:'🥛', u:'adet', m:'bim', p:46.9 },
  { id:'27', n:'Pirinç 1kg', b:'Reis', c:'temel', e:'🍚', u:'paket', m:'a101', p:54.9 },
  { id:'28', n:'Pirinç 1kg', b:'Reis', c:'temel', e:'🍚', u:'paket', m:'bim', p:49.9 },
  { id:'29', n:'Ayçiçek Yağı 2L', b:'Yudum', c:'temel', e:'🫒', u:'adet', m:'a101', p:109.9 },
  { id:'30', n:'Ayçiçek Yağı 2L', b:'Orkide', c:'temel', e:'🫒', u:'adet', m:'bim', p:99.9 },
];

function seed(s: number): number { const x = Math.sin(s * 9301 + 49297) * 49297; return x - Math.floor(x); }

export function generateLivePrices(): LiveProduct[] {
  const day = new Date().getDate();
  return items.map((item, idx) => {
    const r = seed(day * 100 + idx);
    const discount = 0.85 + r * 0.15;
    return {
      id: item.id,
      name: item.n,
      brand: item.b,
      category: item.c,
      emoji: item.e,
      unit: item.u,
      marketId: item.m as MarketId,
      basePrice: item.p,
      currentPrice: +(item.p * discount).toFixed(2),
    };
  });
}

// Uyumluluk — eski import'lar için
export function parseClipboardText(text: string): Array<{ name: string; price?: number }> {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const m = line.match(/(.+?)\s*[-–:]\s*[₺]?\s*(\d+[.,]\d{2})/);
    return m ? { name: m[1].trim(), price: parseFloat(m[2].replace(',', '.')) } : { name: line.replace(/^[-•*\d.)\s]+/, '').trim() };
  }).filter((i) => i.name.length > 1);
}
