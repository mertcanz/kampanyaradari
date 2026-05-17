// ─── Merkezi Market & Kategori Veritabanı ───
// TÜBİTAK marketfiyati.org.tr API'siyle tam uyumlu

// ─── MARKETLER ───
// API'de dönen gerçek market_names: migros, carrefour, a101, bim, tarim_kredi, sok

export type MarketId = string;

export interface Market {
  id: string;
  name: string;
  logo: string;
  color: string;
  bgColor: string;
  borderColor: string;
  gradient: string;
  textColor: string;
}

const marketRegistry: Record<string, Market> = {
  a101:        { id: 'a101',        name: 'A101',        logo: '🔵', color: 'text-blue-400',    bgColor: 'bg-blue-500/10',    borderColor: 'border-blue-500/30',    gradient: 'from-blue-600 to-blue-800',      textColor: 'text-blue-300' },
  bim:         { id: 'bim',         name: 'BİM',         logo: '🔴', color: 'text-red-400',     bgColor: 'bg-red-500/10',     borderColor: 'border-red-500/30',     gradient: 'from-red-600 to-red-800',        textColor: 'text-red-300' },
  sok:         { id: 'sok',         name: 'ŞOK',         logo: '🟡', color: 'text-yellow-400',  bgColor: 'bg-yellow-500/10',  borderColor: 'border-yellow-500/30',  gradient: 'from-yellow-500 to-orange-600',  textColor: 'text-yellow-300' },
  migros:      { id: 'migros',      name: 'Migros',      logo: '🟠', color: 'text-orange-400',  bgColor: 'bg-orange-500/10',  borderColor: 'border-orange-500/30',  gradient: 'from-orange-500 to-orange-700',  textColor: 'text-orange-300' },
  carrefour:   { id: 'carrefour',   name: 'CarrefourSA', logo: '🔷', color: 'text-sky-400',     bgColor: 'bg-sky-500/10',     borderColor: 'border-sky-500/30',     gradient: 'from-sky-500 to-indigo-600',     textColor: 'text-sky-300' },
  tarim_kredi: { id: 'tarim_kredi', name: 'Tarım Kredi', logo: '🟢', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', gradient: 'from-emerald-500 to-emerald-700', textColor: 'text-emerald-300' },
  // Simülasyon fallback
  getir:       { id: 'getir',       name: 'Getir',       logo: '🟣', color: 'text-purple-400',  bgColor: 'bg-purple-500/10',  borderColor: 'border-purple-500/30',  gradient: 'from-purple-600 to-purple-800',  textColor: 'text-purple-300' },
};

const defaultMarket: Market = {
  id: 'unknown', name: 'Market', logo: '🏪',
  color: 'text-slate-400', bgColor: 'bg-slate-500/10',
  borderColor: 'border-slate-500/30', gradient: 'from-slate-600 to-slate-800',
  textColor: 'text-slate-300',
};

// API'den gelen market adını çöz
export function resolveMarket(apiName: string): Market {
  if (!apiName) return defaultMarket;
  const key = apiName.toLowerCase().replace(/\s+/g, '_');
  if (marketRegistry[key]) return marketRegistry[key];
  // Fuzzy
  for (const m of Object.values(marketRegistry)) {
    if (m.name.toLowerCase() === apiName.toLowerCase()) return m;
  }
  return { ...defaultMarket, id: key, name: apiName };
}

// Tüm kayıtlı marketler (UI'da market listesi göstermek için)
export const markets = marketRegistry;

// ─── KATEGORİLER ───
// API'de dönen gerçek main_category değerleri ile uyumlu

export interface Category {
  id: string;
  name: string;          // Görüntülenen ad
  emoji: string;
  searchTerms: string[]; // API'ye gönderilecek arama terimleri
  apiCategories: string[]; // API'den dönen main_category eşleşmeleri
}

export const categories: Category[] = [
  {
    id: 'sut', name: 'Süt Ürünleri', emoji: '🥛',
    searchTerms: ['süt', 'yoğurt', 'ayran', 'kefir', 'krema'],
    apiCategories: ['Süt', 'Yoğurt', 'Ayran ve Kefir'],
  },
  {
    id: 'peynir', name: 'Peynir', emoji: '🧀',
    searchTerms: ['peynir', 'kaşar', 'beyaz peynir', 'lor'],
    apiCategories: ['Peynir'],
  },
  {
    id: 'yumurta', name: 'Yumurta', emoji: '🥚',
    searchTerms: ['yumurta'],
    apiCategories: ['Yumurta'],
  },
  {
    id: 'tereyag', name: 'Tereyağı & Margarin', emoji: '🧈',
    searchTerms: ['tereyağı', 'margarin'],
    apiCategories: ['Tereyağı ve Margarin'],
  },
  {
    id: 'et', name: 'Et & Tavuk', emoji: '🥩',
    searchTerms: ['tavuk', 'dana', 'kuzu', 'kıyma', 'sucuk', 'sosis'],
    apiCategories: ['Beyaz Et', 'Kırmızı Et', 'İşlenmiş Et Ürünleri'],
  },
  {
    id: 'balik', name: 'Balık & Deniz', emoji: '🐟',
    searchTerms: ['balık', 'somon', 'hamsi', 'ton balığı'],
    apiCategories: ['Balık ve Deniz Ürünleri'],
  },
  {
    id: 'sebze', name: 'Sebze', emoji: '🥬',
    searchTerms: ['domates', 'salatalık', 'biber', 'patates', 'soğan', 'patlıcan'],
    apiCategories: ['Sebze', 'Taze Sebze'],
  },
  {
    id: 'meyve', name: 'Meyve', emoji: '🍎',
    searchTerms: ['elma', 'muz', 'portakal', 'üzüm', 'çilek', 'mandalina'],
    apiCategories: ['Meyve', 'Taze Meyve'],
  },
  {
    id: 'temel', name: 'Temel Gıda', emoji: '🌾',
    searchTerms: ['makarna', 'pirinç', 'bulgur', 'un', 'şeker', 'tuz', 'mercimek', 'nohut'],
    apiCategories: ['Bakliyat', 'Mantı Makarna ve Erişte', 'Pirinç Bulgur ve Tahıl', 'Un ve Unlu Mamüller', 'Şeker ve Tuz'],
  },
  {
    id: 'yag', name: 'Yağ & Zeytin', emoji: '🫒',
    searchTerms: ['zeytinyağı', 'ayçiçek yağı', 'sıvı yağ', 'zeytin'],
    apiCategories: ['Sıvı ve Katı Yağlar', 'Zeytin'],
  },
  {
    id: 'ekmek', name: 'Ekmek & Unlu', emoji: '🍞',
    searchTerms: ['ekmek', 'simit', 'poğaça', 'börek'],
    apiCategories: ['Ekmek ve Unlu Mamüller'],
  },
  {
    id: 'kahvalti', name: 'Kahvaltılık', emoji: '🍳',
    searchTerms: ['bal', 'reçel', 'pekmez', 'tahin'],
    apiCategories: ['Bal ve Reçel', 'Sürülebilir Ürünler ve Kahvaltılık Soslar'],
  },
  {
    id: 'icecek', name: 'İçecekler', emoji: '🥤',
    searchTerms: ['çay', 'kahve', 'nescafe', 'su', 'meyve suyu'],
    apiCategories: ['Çay', 'Kahve', 'Su', 'Gazsız İçecekler', 'Gazlı İçecekler', 'Meyve Suyu'],
  },
  {
    id: 'konserve', name: 'Konserve & Sos', emoji: '🥫',
    searchTerms: ['salça', 'konserve', 'ketçap', 'mayonez', 'sos'],
    apiCategories: ['Salça', 'Konserve', 'Ketçap Mayonez Sos ve Sirkeler', 'Hazır Gıda'],
  },
  {
    id: 'atistirma', name: 'Atıştırmalık', emoji: '🍫',
    searchTerms: ['çikolata', 'bisküvi', 'cips', 'gofret', 'kek', 'kraker'],
    apiCategories: ['Çikolata', 'Bisküvi ve Kraker', 'Cips', 'Gofret', 'Kek', 'Sakız ve Şekerleme', 'Kahvaltılık Gevrek Bar ve Granola'],
  },
  {
    id: 'dondurma', name: 'Dondurulmuş', emoji: '🧊',
    searchTerms: ['dondurma', 'dondurulmuş', 'pizza'],
    apiCategories: ['Dondurmalar', 'Dondurulmuş Gıda', 'Tatlılar'],
  },
  {
    id: 'temizlik', name: 'Temizlik', emoji: '🧹',
    searchTerms: ['deterjan', 'yumuşatıcı', 'bulaşık', 'tuvalet kağıdı', 'kağıt havlu'],
    apiCategories: ['Genel Temizlik Ürünleri', 'Bulaşık Temizlik Ürünleri', 'Çamaşır Deterjanları', 'Kağıt Ürünleri', 'Diğer Temizlik ve Kişisel Bakım Ürünleri'],
  },
  {
    id: 'bakim', name: 'Kişisel Bakım', emoji: '🧴',
    searchTerms: ['şampuan', 'diş macunu', 'sabun', 'duş jeli', 'deodorant'],
    apiCategories: ['Duş Banyo ve Sabun', 'Saç Bakım', 'Ağız Bakım', 'Cilt Bakımı', 'Parfüm Deodorant Kolonya ve Kokular', 'Sağlık Ürünleri'],
  },
  {
    id: 'bebek', name: 'Bebek', emoji: '👶',
    searchTerms: ['bebek bezi', 'mama', 'bebek'],
    apiCategories: ['Bebek Mamaları', 'Bebek Bezi ve Mendil'],
  },
  {
    id: 'kuruyemis', name: 'Kuruyemiş', emoji: '🥜',
    searchTerms: ['kuruyemiş', 'fındık', 'fıstık', 'ceviz', 'badem'],
    apiCategories: ['Kuruyemiş ve Kuru Meyve'],
  },
  {
    id: 'pasta', name: 'Pasta Malzemeleri', emoji: '🎂',
    searchTerms: ['un', 'maya', 'kakao', 'vanilya', 'kabartma tozu'],
    apiCategories: ['Pasta Malzemeleri'],
  },
];

// ─── Emoji Resolver ───

const emojiMap: Record<string, string> = {
  // Sebze
  domates:'🍅', salatalık:'🥒', patates:'🥔', soğan:'🧅', biber:'🌶️',
  patlıcan:'🍆', havuç:'🥕', kabak:'🥒', ıspanak:'🥬', marul:'🥬',
  brokoli:'🥦', lahana:'🥬', fasulye:'🫘', bezelye:'🫛', mantar:'🍄',
  // Meyve
  elma:'🍎', muz:'🍌', portakal:'🍊', limon:'🍋', mandalina:'🍊',
  çilek:'🍓', karpuz:'🍉', üzüm:'🍇', armut:'🍐', nar:'🫐',
  kayısı:'🍑', şeftali:'🍑', kiraz:'🍒', avokado:'🥑',
  // Süt
  süt:'🥛', yoğurt:'🥛', peynir:'🧀', kaşar:'🧀', tereyağı:'🧈',
  kaymak:'🥛', ayran:'🥛', kefir:'🥛', krema:'🥛',
  // Et
  tavuk:'🍗', dana:'🥩', kuzu:'🥩', kıyma:'🥩', pirzola:'🥩',
  sucuk:'🌭', sosis:'🌭', köfte:'🥩', hindi:'🍗',
  balık:'🐟', somon:'🐟', hamsi:'🐟', levrek:'🐟', ton:'🐟', karides:'🦐',
  // Temel
  yumurta:'🥚', ekmek:'🍞', makarna:'🍝', pirinç:'🍚', bulgur:'🌾',
  un:'🌾', şeker:'🍬', tuz:'🧂', mercimek:'🫘', nohut:'🫘',
  // Yağ
  zeytinyağı:'🫒', ayçiçek:'🫒', zeytin:'🫒', yağ:'🫒',
  // İçecek
  çay:'🍵', kahve:'☕', nescafe:'☕', su:'💧', meyve_suyu:'🧃',
  kola:'🥤', soda:'🥤', ayran_icecek:'🥛',
  // Kahvaltı
  bal:'🍯', reçel:'🍓', pekmez:'🫙', tahin:'🫙',
  // Konserve
  salça:'🥫', konserve:'🥫', ketçap:'🥫', mayonez:'🥫', sos:'🥫', sirke:'🍶',
  // Atıştırmalık
  çikolata:'🍫', bisküvi:'🍪', cips:'🥔', gofret:'🍫', kek:'🧁',
  kraker:'🍘', kuruyemiş:'🥜', lokum:'🍬', şekerleme:'🍬',
  dondurma:'🍦', pizza:'🍕',
  // Temizlik
  deterjan:'🧺', yumuşatıcı:'🧴', bulaşık:'🧴', çamaşır:'🧺',
  kağıt:'🧻', mendil:'🧻', sünger:'🧽', çöp:'🗑️',
  // Bakım
  şampuan:'🧴', sabun:'🧼', diş:'🪥', deodorant:'🧴', duş:'🧴',
  // Bebek
  mama:'🍼', bebek:'👶', bezi:'👶',
};

export function getProductEmoji(name: string, category = ''): string {
  const text = `${name} ${category}`.toLowerCase();
  for (const [kw, emoji] of Object.entries(emojiMap)) {
    if (text.includes(kw)) return emoji;
  }
  return '📦';
}

export function getNeedEmoji(keyword: string): string {
  return getProductEmoji(keyword);
}
