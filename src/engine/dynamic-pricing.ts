import { type MarketId } from '../data/markets';

type CategoryType = 'meyve_sebze' | 'et_tavuk' | 'sut_urunleri' | 'temel_gida' | 'icecekler' | 'temizlik' | 'kisisel_bakim' | 'atistirmalik' | 'dondurulmus' | 'firincilik' | 'baharat';

// ─── Dynamic Price Engine ───
// Simulates realistic price fluctuations based on:
// - Time of day, day of week
// - Seasonal patterns
// - Random daily variance
// - Community submissions

export interface LiveProduct {
  id: string;
  name: string;
  brand: string;
  category: CategoryType;
  emoji: string;
  unit: string;
  marketId: MarketId;
  basePrice: number; // reference price
  currentPrice: number; // dynamically calculated
  previousPrice: number; // yesterday's price
  lowestEver: number;
  highestEver: number;
  lastUpdated: Date;
  updatedBy: 'system' | 'community';
  verifiedCount: number;
  reportCount: number;
  priceDirection: 'up' | 'down' | 'stable';
  changePercent: number;
  tags: string[];
}

// Seed-based pseudo random for consistency within same day
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function getDaySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function getHourFactor(): number {
  const hour = new Date().getHours();
  // Prices slightly lower in morning, peak in evening
  if (hour < 8) return 0.97;
  if (hour < 12) return 0.98;
  if (hour < 16) return 1.0;
  if (hour < 20) return 1.02;
  return 1.01;
}

function getWeekdayFactor(): number {
  const day = new Date().getDay();
  // Tuesdays/Wednesdays BIM/A101 aktüel günleri — more discounts
  if (day === 2 || day === 3) return 0.95;
  // Weekends slightly higher
  if (day === 0 || day === 6) return 1.03;
  return 1.0;
}

function getSeasonalFactor(category: CategoryType): number {
  const month = new Date().getMonth(); // 0-11
  // Summer: fruits/veggies cheaper
  if (category === 'meyve_sebze') {
    if (month >= 5 && month <= 8) return 0.85;
    if (month >= 11 || month <= 1) return 1.15;
  }
  // Winter: heating costs affect prices
  if (month >= 11 || month <= 2) return 1.05;
  return 1.0;
}

// ─── Base Product Data (expanded) ───

interface BaseProduct {
  id: string;
  name: string;
  brand: string;
  category: CategoryType;
  emoji: string;
  unit: string;
  marketId: MarketId;
  basePrice: number;
  tags: string[];
}

const baseProducts: BaseProduct[] = [
  // A101
  { id: 'a-domates', name: 'Domates', brand: 'Yerli Üretim', category: 'meyve_sebze', emoji: '🍅', unit: 'kg', marketId: 'a101', basePrice: 39.90, tags: ['temel', 'sebze'] },
  { id: 'a-salatalik', name: 'Salatalık', brand: 'Yerli Üretim', category: 'meyve_sebze', emoji: '🥒', unit: 'kg', marketId: 'a101', basePrice: 29.90, tags: ['temel', 'sebze'] },
  { id: 'a-patates', name: 'Patates', brand: 'Yerli', category: 'meyve_sebze', emoji: '🥔', unit: 'kg', marketId: 'a101', basePrice: 24.90, tags: ['temel'] },
  { id: 'a-sogan', name: 'Soğan', brand: 'Yerli', category: 'meyve_sebze', emoji: '🧅', unit: 'kg', marketId: 'a101', basePrice: 19.90, tags: ['temel'] },
  { id: 'a-elma', name: 'Elma', brand: 'Yerli', category: 'meyve_sebze', emoji: '🍎', unit: 'kg', marketId: 'a101', basePrice: 39.90, tags: ['meyve'] },
  { id: 'a-muz', name: 'Muz', brand: 'İthal', category: 'meyve_sebze', emoji: '🍌', unit: 'kg', marketId: 'a101', basePrice: 59.90, tags: ['meyve'] },
  { id: 'a-portakal', name: 'Portakal', brand: 'Yerli', category: 'meyve_sebze', emoji: '🍊', unit: 'kg', marketId: 'a101', basePrice: 29.90, tags: ['meyve'] },
  { id: 'a-yumurta', name: 'Yumurta 15li', brand: 'Köy Yumurtası', category: 'temel_gida', emoji: '🥚', unit: 'paket', marketId: 'a101', basePrice: 74.90, tags: ['temel', 'kahvaltı'] },
  { id: 'a-sut', name: 'Süt 1L', brand: 'İçim', category: 'sut_urunleri', emoji: '🥛', unit: 'adet', marketId: 'a101', basePrice: 38.90, tags: ['temel', 'kahvaltı'] },
  { id: 'a-yogurt', name: 'Yoğurt 1kg', brand: 'Sütaş', category: 'sut_urunleri', emoji: '🥛', unit: 'adet', marketId: 'a101', basePrice: 49.90, tags: ['temel'] },
  { id: 'a-peynir', name: 'Beyaz Peynir', brand: 'Tahsildaroğlu', category: 'sut_urunleri', emoji: '🧀', unit: 'kg', marketId: 'a101', basePrice: 189.90, tags: ['kahvaltı'] },
  { id: 'a-kasar', name: 'Kaşar Peyniri', brand: 'Pınar', category: 'sut_urunleri', emoji: '🧀', unit: 'kg', marketId: 'a101', basePrice: 249.90, tags: ['kahvaltı'] },
  { id: 'a-tereyag', name: 'Tereyağı 250g', brand: 'Ülker', category: 'sut_urunleri', emoji: '🧈', unit: 'adet', marketId: 'a101', basePrice: 89.90, tags: ['kahvaltı'] },
  { id: 'a-tavuk', name: 'Tavuk Göğüs', brand: 'Banvit', category: 'et_tavuk', emoji: '🍗', unit: 'kg', marketId: 'a101', basePrice: 159.90, tags: ['et'] },
  { id: 'a-kiyma', name: 'Dana Kıyma', brand: 'Namet', category: 'et_tavuk', emoji: '🥩', unit: 'kg', marketId: 'a101', basePrice: 429.90, tags: ['et'] },
  { id: 'a-sucuk', name: 'Sucuk 250g', brand: 'Egeturk', category: 'et_tavuk', emoji: '🌭', unit: 'adet', marketId: 'a101', basePrice: 59.90, tags: ['kahvaltı'] },
  { id: 'a-ekmek', name: 'Ekmek', brand: 'Uno', category: 'firincilik', emoji: '🍞', unit: 'adet', marketId: 'a101', basePrice: 10.00, tags: ['temel'] },
  { id: 'a-makarna', name: 'Makarna 500g', brand: 'Barilla', category: 'temel_gida', emoji: '🍝', unit: 'paket', marketId: 'a101', basePrice: 21.90, tags: ['temel'] },
  { id: 'a-pirinc', name: 'Pirinç 1kg', brand: 'Reis', category: 'temel_gida', emoji: '🍚', unit: 'paket', marketId: 'a101', basePrice: 54.90, tags: ['temel'] },
  { id: 'a-bulgur', name: 'Bulgur 1kg', brand: 'Duru', category: 'temel_gida', emoji: '🌾', unit: 'paket', marketId: 'a101', basePrice: 39.90, tags: ['temel'] },
  { id: 'a-mercimek', name: 'Kırmızı Mercimek', brand: 'Yayla', category: 'temel_gida', emoji: '🫘', unit: 'kg', marketId: 'a101', basePrice: 49.90, tags: ['temel'] },
  { id: 'a-yag', name: 'Ayçiçek Yağı 2L', brand: 'Yudum', category: 'temel_gida', emoji: '🫒', unit: 'adet', marketId: 'a101', basePrice: 109.90, tags: ['temel'] },
  { id: 'a-zeytinyag', name: 'Zeytinyağı 1L', brand: 'Komili', category: 'temel_gida', emoji: '🫒', unit: 'adet', marketId: 'a101', basePrice: 239.90, tags: ['temel'] },
  { id: 'a-seker', name: 'Şeker 1kg', brand: 'Torku', category: 'temel_gida', emoji: '🍬', unit: 'paket', marketId: 'a101', basePrice: 29.90, tags: ['temel'] },
  { id: 'a-cay', name: 'Çay 1kg', brand: 'Doğuş', category: 'icecekler', emoji: '🍵', unit: 'paket', marketId: 'a101', basePrice: 109.90, tags: ['temel'] },
  { id: 'a-salca', name: 'Domates Salçası', brand: 'Tat', category: 'baharat', emoji: '🥫', unit: 'adet', marketId: 'a101', basePrice: 49.90, tags: ['temel'] },
  { id: 'a-tuvalet', name: 'Tuvalet Kağıdı 24lü', brand: 'Solo', category: 'temizlik', emoji: '🧻', unit: 'paket', marketId: 'a101', basePrice: 159.90, tags: ['temizlik'] },
  { id: 'a-deterjan', name: 'Çamaşır Deterjanı 4kg', brand: 'Persil', category: 'temizlik', emoji: '🧺', unit: 'paket', marketId: 'a101', basePrice: 199.90, tags: ['temizlik'] },
  { id: 'a-nescafe', name: 'Nescafe 200g', brand: 'Nescafe', category: 'icecekler', emoji: '☕', unit: 'kavanoz', marketId: 'a101', basePrice: 149.90, tags: ['kahvaltı'] },

  // BİM
  { id: 'b-domates', name: 'Domates', brand: 'Yerli', category: 'meyve_sebze', emoji: '🍅', unit: 'kg', marketId: 'bim', basePrice: 37.90, tags: ['temel'] },
  { id: 'b-salatalik', name: 'Salatalık', brand: 'Yerli', category: 'meyve_sebze', emoji: '🥒', unit: 'kg', marketId: 'bim', basePrice: 27.90, tags: ['temel'] },
  { id: 'b-patates', name: 'Patates', brand: 'Yerli', category: 'meyve_sebze', emoji: '🥔', unit: 'kg', marketId: 'bim', basePrice: 22.90, tags: ['temel'] },
  { id: 'b-sogan', name: 'Soğan', brand: 'Yerli', category: 'meyve_sebze', emoji: '🧅', unit: 'kg', marketId: 'bim', basePrice: 17.90, tags: ['temel'] },
  { id: 'b-muz', name: 'Muz', brand: 'İthal', category: 'meyve_sebze', emoji: '🍌', unit: 'kg', marketId: 'bim', basePrice: 54.90, tags: ['meyve'] },
  { id: 'b-elma', name: 'Elma', brand: 'Yerli', category: 'meyve_sebze', emoji: '🍎', unit: 'kg', marketId: 'bim', basePrice: 34.90, tags: ['meyve'] },
  { id: 'b-yumurta', name: 'Yumurta 15li', brand: 'Hastavuk', category: 'temel_gida', emoji: '🥚', unit: 'paket', marketId: 'bim', basePrice: 69.90, tags: ['temel'] },
  { id: 'b-sut', name: 'Süt 1L', brand: 'İçim', category: 'sut_urunleri', emoji: '🥛', unit: 'adet', marketId: 'bim', basePrice: 36.90, tags: ['temel'] },
  { id: 'b-yogurt', name: 'Yoğurt 1kg', brand: 'Sütaş', category: 'sut_urunleri', emoji: '🥛', unit: 'adet', marketId: 'bim', basePrice: 46.90, tags: ['temel'] },
  { id: 'b-peynir', name: 'Beyaz Peynir', brand: 'Bahçıvan', category: 'sut_urunleri', emoji: '🧀', unit: 'kg', marketId: 'bim', basePrice: 179.90, tags: ['kahvaltı'] },
  { id: 'b-kasar', name: 'Kaşar Peyniri', brand: 'Bahçıvan', category: 'sut_urunleri', emoji: '🧀', unit: 'kg', marketId: 'bim', basePrice: 239.90, tags: ['kahvaltı'] },
  { id: 'b-tavuk', name: 'Tavuk But', brand: 'Banvit', category: 'et_tavuk', emoji: '🍗', unit: 'kg', marketId: 'bim', basePrice: 139.90, tags: ['et'] },
  { id: 'b-sucuk', name: 'Sucuk 250g', brand: 'Egeturk', category: 'et_tavuk', emoji: '🌭', unit: 'adet', marketId: 'bim', basePrice: 54.90, tags: ['kahvaltı'] },
  { id: 'b-ekmek', name: 'Ekmek', brand: 'Uno', category: 'firincilik', emoji: '🍞', unit: 'adet', marketId: 'bim', basePrice: 9.50, tags: ['temel'] },
  { id: 'b-makarna', name: 'Makarna 500g', brand: 'Filiz', category: 'temel_gida', emoji: '🍝', unit: 'paket', marketId: 'bim', basePrice: 18.90, tags: ['temel'] },
  { id: 'b-pirinc', name: 'Pirinç 1kg', brand: 'Reis', category: 'temel_gida', emoji: '🍚', unit: 'paket', marketId: 'bim', basePrice: 49.90, tags: ['temel'] },
  { id: 'b-yag', name: 'Ayçiçek Yağı 2L', brand: 'Orkide', category: 'temel_gida', emoji: '🫒', unit: 'adet', marketId: 'bim', basePrice: 99.90, tags: ['temel'] },
  { id: 'b-seker', name: 'Şeker 1kg', brand: 'Torku', category: 'temel_gida', emoji: '🍬', unit: 'paket', marketId: 'bim', basePrice: 27.90, tags: ['temel'] },
  { id: 'b-cay', name: 'Çay 1kg', brand: 'Doğuş', category: 'icecekler', emoji: '🍵', unit: 'paket', marketId: 'bim', basePrice: 104.90, tags: ['temel'] },
  { id: 'b-deterjan', name: 'Çamaşır Deterjanı 4kg', brand: 'Bingo', category: 'temizlik', emoji: '🧺', unit: 'paket', marketId: 'bim', basePrice: 149.90, tags: ['temizlik'] },
  { id: 'b-tuvalet', name: 'Tuvalet Kağıdı 24lü', brand: 'Familia', category: 'temizlik', emoji: '🧻', unit: 'paket', marketId: 'bim', basePrice: 149.90, tags: ['temizlik'] },

  // ŞOK
  { id: 's-domates', name: 'Domates', brand: 'Yerli', category: 'meyve_sebze', emoji: '🍅', unit: 'kg', marketId: 'sok', basePrice: 38.90, tags: ['temel'] },
  { id: 's-patates', name: 'Patates', brand: 'Yerli', category: 'meyve_sebze', emoji: '🥔', unit: 'kg', marketId: 'sok', basePrice: 23.90, tags: ['temel'] },
  { id: 's-sogan', name: 'Soğan', brand: 'Yerli', category: 'meyve_sebze', emoji: '🧅', unit: 'kg', marketId: 'sok', basePrice: 18.90, tags: ['temel'] },
  { id: 's-muz', name: 'Muz', brand: 'İthal', category: 'meyve_sebze', emoji: '🍌', unit: 'kg', marketId: 'sok', basePrice: 57.90, tags: ['meyve'] },
  { id: 's-yumurta', name: 'Yumurta 15li', brand: 'Çiftlik', category: 'temel_gida', emoji: '🥚', unit: 'paket', marketId: 'sok', basePrice: 72.90, tags: ['temel'] },
  { id: 's-sut', name: 'Süt 1L', brand: 'Pınar', category: 'sut_urunleri', emoji: '🥛', unit: 'adet', marketId: 'sok', basePrice: 39.90, tags: ['temel'] },
  { id: 's-yogurt', name: 'Yoğurt 1kg', brand: 'Pınar', category: 'sut_urunleri', emoji: '🥛', unit: 'adet', marketId: 'sok', basePrice: 48.90, tags: ['temel'] },
  { id: 's-peynir', name: 'Beyaz Peynir', brand: 'Muratbey', category: 'sut_urunleri', emoji: '🧀', unit: 'kg', marketId: 'sok', basePrice: 199.90, tags: ['kahvaltı'] },
  { id: 's-tavuk', name: 'Tavuk Göğüs', brand: 'CP', category: 'et_tavuk', emoji: '🍗', unit: 'kg', marketId: 'sok', basePrice: 164.90, tags: ['et'] },
  { id: 's-kiyma', name: 'Dana Kıyma', brand: 'Namet', category: 'et_tavuk', emoji: '🥩', unit: 'kg', marketId: 'sok', basePrice: 419.90, tags: ['et'] },
  { id: 's-makarna', name: 'Makarna 500g', brand: 'Barilla', category: 'temel_gida', emoji: '🍝', unit: 'paket', marketId: 'sok', basePrice: 22.90, tags: ['temel'] },
  { id: 's-bulgur', name: 'Bulgur 1kg', brand: 'Duru', category: 'temel_gida', emoji: '🌾', unit: 'paket', marketId: 'sok', basePrice: 37.90, tags: ['temel'] },
  { id: 's-mercimek', name: 'Kırmızı Mercimek', brand: 'Yayla', category: 'temel_gida', emoji: '🫘', unit: 'kg', marketId: 'sok', basePrice: 47.90, tags: ['temel'] },
  { id: 's-nescafe', name: 'Nescafe 200g', brand: 'Nescafe', category: 'icecekler', emoji: '☕', unit: 'kavanoz', marketId: 'sok', basePrice: 144.90, tags: ['kahvaltı'] },
  { id: 's-deterjan', name: 'Çamaşır Deterjanı 4kg', brand: 'Omo', category: 'temizlik', emoji: '🧺', unit: 'paket', marketId: 'sok', basePrice: 179.90, tags: ['temizlik'] },

  // MİGROS
  { id: 'm-domates', name: 'Domates', brand: 'Migros Yerli', category: 'meyve_sebze', emoji: '🍅', unit: 'kg', marketId: 'migros', basePrice: 42.90, tags: ['temel'] },
  { id: 'm-salatalik', name: 'Salatalık', brand: 'Migros Yerli', category: 'meyve_sebze', emoji: '🥒', unit: 'kg', marketId: 'migros', basePrice: 32.90, tags: ['temel'] },
  { id: 'm-muz', name: 'Muz', brand: 'İthal', category: 'meyve_sebze', emoji: '🍌', unit: 'kg', marketId: 'migros', basePrice: 64.90, tags: ['meyve'] },
  { id: 'm-sut', name: 'Süt 1L', brand: 'Sütaş', category: 'sut_urunleri', emoji: '🥛', unit: 'adet', marketId: 'migros', basePrice: 41.90, tags: ['temel'] },
  { id: 'm-yogurt', name: 'Yoğurt 1kg', brand: 'Sütaş', category: 'sut_urunleri', emoji: '🥛', unit: 'adet', marketId: 'migros', basePrice: 52.90, tags: ['temel'] },
  { id: 'm-peynir', name: 'Beyaz Peynir', brand: 'Pınar', category: 'sut_urunleri', emoji: '🧀', unit: 'kg', marketId: 'migros', basePrice: 209.90, tags: ['kahvaltı'] },
  { id: 'm-tereyag', name: 'Tereyağı 250g', brand: 'Lurpak', category: 'sut_urunleri', emoji: '🧈', unit: 'adet', marketId: 'migros', basePrice: 99.90, tags: ['kahvaltı'] },
  { id: 'm-tavuk', name: 'Tavuk Göğüs', brand: 'Banvit', category: 'et_tavuk', emoji: '🍗', unit: 'kg', marketId: 'migros', basePrice: 174.90, tags: ['et'] },
  { id: 'm-somon', name: 'Somon Fileto', brand: 'Dardanel', category: 'et_tavuk', emoji: '🐟', unit: 'kg', marketId: 'migros', basePrice: 389.90, tags: ['et', 'deniz'] },
  { id: 'm-bal', name: 'Bal 450g', brand: 'Balparmak', category: 'temel_gida', emoji: '🍯', unit: 'kavanoz', marketId: 'migros', basePrice: 129.90, tags: ['kahvaltı'] },
  { id: 'm-zeytin', name: 'Zeytin 500g', brand: 'Marmarabirlik', category: 'temel_gida', emoji: '🫒', unit: 'kavanoz', marketId: 'migros', basePrice: 62.90, tags: ['kahvaltı'] },
  { id: 'm-zeytinyag', name: 'Zeytinyağı 2L', brand: 'Tariş', category: 'temel_gida', emoji: '🫒', unit: 'adet', marketId: 'migros', basePrice: 449.90, tags: ['temel'] },
  { id: 'm-cikolata', name: 'Çikolata 80g', brand: 'Ülker', category: 'atistirmalik', emoji: '🍫', unit: 'adet', marketId: 'migros', basePrice: 26.90, tags: ['atıştırmalık'] },
  { id: 'm-cips', name: 'Patates Cipsi', brand: 'Lays', category: 'atistirmalik', emoji: '🥔', unit: 'paket', marketId: 'migros', basePrice: 34.90, tags: ['atıştırmalık'] },
  { id: 'm-dondurma', name: 'Dondurma 1L', brand: 'Algida', category: 'dondurulmus', emoji: '🍦', unit: 'adet', marketId: 'migros', basePrice: 79.90, tags: ['atıştırmalık'] },
  { id: 'm-sampuan', name: 'Şampuan 500ml', brand: 'H&S', category: 'kisisel_bakim', emoji: '🧴', unit: 'adet', marketId: 'migros', basePrice: 89.90, tags: ['kişisel'] },

  // GETİR
  { id: 'g-sut', name: 'Süt 1L', brand: 'Pınar', category: 'sut_urunleri', emoji: '🥛', unit: 'adet', marketId: 'getir', basePrice: 40.90, tags: ['temel'] },
  { id: 'g-ekmek', name: 'Ekmek', brand: 'Getir', category: 'firincilik', emoji: '🍞', unit: 'adet', marketId: 'getir', basePrice: 10.90, tags: ['temel'] },
  { id: 'g-muz', name: 'Muz', brand: 'İthal', category: 'meyve_sebze', emoji: '🍌', unit: 'kg', marketId: 'getir', basePrice: 62.90, tags: ['meyve'] },
  { id: 'g-yogurt', name: 'Yoğurt 1kg', brand: 'Pınar', category: 'sut_urunleri', emoji: '🥛', unit: 'adet', marketId: 'getir', basePrice: 50.90, tags: ['temel'] },
  { id: 'g-yumurta', name: 'Yumurta 10lu', brand: 'Getir Yerli', category: 'temel_gida', emoji: '🥚', unit: 'paket', marketId: 'getir', basePrice: 54.90, tags: ['temel'] },
  { id: 'g-su', name: 'Su 6x1.5L', brand: 'Erikli', category: 'icecekler', emoji: '💧', unit: 'paket', marketId: 'getir', basePrice: 49.90, tags: ['temel'] },
  { id: 'g-pizza', name: 'Dondurulmuş Pizza', brand: 'Dr.Oetker', category: 'dondurulmus', emoji: '🍕', unit: 'adet', marketId: 'getir', basePrice: 62.90, tags: ['atıştırmalık'] },
  { id: 'g-cikolata', name: 'Çikolata Bar', brand: 'Eti', category: 'atistirmalik', emoji: '🍫', unit: 'adet', marketId: 'getir', basePrice: 17.90, tags: ['atıştırmalık'] },
  { id: 'g-mendil', name: 'Islak Mendil 3lü', brand: 'Sleepy', category: 'kisisel_bakim', emoji: '🧻', unit: 'paket', marketId: 'getir', basePrice: 49.90, tags: ['kişisel'] },

  // CARREFOURSA
  { id: 'c-tavuk', name: 'Tavuk Bütün', brand: 'Keskinoğlu', category: 'et_tavuk', emoji: '🍗', unit: 'kg', marketId: 'carrefour', basePrice: 109.90, tags: ['et'] },
  { id: 'c-pirinc', name: 'Pirinç 2kg', brand: 'Reis Baldo', category: 'temel_gida', emoji: '🍚', unit: 'paket', marketId: 'carrefour', basePrice: 109.90, tags: ['temel'] },
  { id: 'c-deterjan', name: 'Çamaşır Deterjanı 6kg', brand: 'Persil', category: 'temizlik', emoji: '🧺', unit: 'paket', marketId: 'carrefour', basePrice: 279.90, tags: ['temizlik'] },
  { id: 'c-salca', name: 'Domates Salçası 1650g', brand: 'Tat', category: 'baharat', emoji: '🥫', unit: 'adet', marketId: 'carrefour', basePrice: 69.90, tags: ['temel'] },
  { id: 'c-portakal', name: 'Portakal', brand: 'Yerli', category: 'meyve_sebze', emoji: '🍊', unit: 'kg', marketId: 'carrefour', basePrice: 32.90, tags: ['meyve'] },
  { id: 'c-fasulye', name: 'Kuru Fasulye 1kg', brand: 'Yayla', category: 'temel_gida', emoji: '🫘', unit: 'paket', marketId: 'carrefour', basePrice: 74.90, tags: ['temel'] },
  { id: 'c-yumusatici', name: 'Yumuşatıcı 2L', brand: 'Vernel', category: 'temizlik', emoji: '🧴', unit: 'adet', marketId: 'carrefour', basePrice: 79.90, tags: ['temizlik'] },
  { id: 'c-ketcap', name: 'Ketçap 650g', brand: 'Heinz', category: 'baharat', emoji: '🥫', unit: 'adet', marketId: 'carrefour', basePrice: 49.90, tags: ['sos'] },
];

// ─── Generate Live Prices ───

export function generateLivePrices(): LiveProduct[] {
  const daySeed = getDaySeed();
  const hourFactor = getHourFactor();
  const weekdayFactor = getWeekdayFactor();
  const now = new Date();

  return baseProducts.map((bp, idx) => {
    const seasonFactor = getSeasonalFactor(bp.category);
    const itemRandom = seededRandom(daySeed + idx * 7);

    // Discount: 5% to 40% based on day seed
    const discountPercent = 5 + itemRandom * 35;
    const discountFactor = 1 - (discountPercent / 100);

    const rawPrice = bp.basePrice * discountFactor * hourFactor * weekdayFactor * seasonFactor;
    const currentPrice = +Math.max(rawPrice, bp.basePrice * 0.55).toFixed(2);

    // Yesterday's price simulation
    const yesterdaySeed = daySeed - 1;
    const yesterdayRandom = seededRandom(yesterdaySeed + idx * 7);
    const yesterdayDiscount = 5 + yesterdayRandom * 35;
    const previousPrice = +(bp.basePrice * (1 - yesterdayDiscount / 100)).toFixed(2);

    const changePercent = +((currentPrice - previousPrice) / previousPrice * 100).toFixed(1);
    const priceDirection = changePercent < -2 ? 'down' as const : changePercent > 2 ? 'up' as const : 'stable' as const;

    // Minutes since last "update"
    const minutesAgo = Math.floor(seededRandom(daySeed + idx * 3) * 120);
    const lastUpdated = new Date(now.getTime() - minutesAgo * 60 * 1000);

    return {
      id: bp.id,
      name: bp.name,
      brand: bp.brand,
      category: bp.category,
      emoji: bp.emoji,
      unit: bp.unit,
      marketId: bp.marketId,
      basePrice: bp.basePrice,
      currentPrice,
      previousPrice,
      lowestEver: +(bp.basePrice * 0.55).toFixed(2),
      highestEver: bp.basePrice,
      lastUpdated,
      updatedBy: itemRandom > 0.7 ? 'community' : 'system',
      verifiedCount: Math.floor(itemRandom * 50) + 1,
      reportCount: Math.floor(itemRandom * 5),
      priceDirection,
      changePercent: Math.abs(changePercent),
      tags: bp.tags,
    };
  });
}

// ─── Community Submissions ───

export interface CommunitySubmission {
  id: string;
  productName: string;
  marketId: MarketId;
  price: number;
  submittedAt: Date;
  username: string;
  verified: boolean;
  upvotes: number;
}

const STORAGE_KEY = 'community_submissions';

export function loadSubmissions(): CommunitySubmission[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function saveSubmission(sub: Omit<CommunitySubmission, 'id' | 'submittedAt' | 'verified' | 'upvotes'>): CommunitySubmission {
  const submissions = loadSubmissions();
  const newSub: CommunitySubmission = {
    ...sub,
    id: `cs-${Date.now()}`,
    submittedAt: new Date(),
    verified: false,
    upvotes: 0,
  };
  submissions.unshift(newSub);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions.slice(0, 200)));
  return newSub;
}

export function upvoteSubmission(id: string): void {
  const subs = loadSubmissions();
  const sub = subs.find((s) => s.id === id);
  if (sub) {
    sub.upvotes++;
    if (sub.upvotes >= 3) sub.verified = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
  }
}

// ─── Smart Text Parser ───

export interface ParsedItem {
  name: string;
  price?: number;
  market?: string;
}

export function parseClipboardText(text: string): ParsedItem[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: ParsedItem[] = [];

  for (const line of lines) {
    // Try to match patterns like "Domates 29.90" or "Domates - 29.90 TL" or just "Domates"
    const priceMatch = line.match(/(.+?)\s*[-–:]\s*[₺]?\s*(\d+[.,]\d{2})\s*(TL)?/i);
    if (priceMatch) {
      items.push({
        name: priceMatch[1].trim(),
        price: parseFloat(priceMatch[2].replace(',', '.')),
      });
    } else {
      // Just a product name
      const cleaned = line.replace(/^[-•*\d.)\s]+/, '').trim();
      if (cleaned.length > 1) {
        items.push({ name: cleaned });
      }
    }
  }

  return items;
}
