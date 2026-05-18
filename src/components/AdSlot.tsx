// ─── Reklam Alanı Bileşeni ───
// Google AdSense veya kendi reklamlarınız için hazır alan
// Kullanıcı deneyimini bozmayacak şekilde tasarlandı

interface AdSlotProps {
  type: 'banner' | 'native' | 'between';
  className?: string;
}

export default function AdSlot({ type, className = '' }: AdSlotProps) {
  // Gerçek AdSense entegrasyonunda buraya <ins> tag'i gelecek
  // Şimdilik placeholder gösteriyoruz

  if (type === 'banner') {
    return (
      <div className={`rounded-xl border border-slate-700/30 bg-slate-800/20 overflow-hidden ${className}`}>
        <div className="flex items-center justify-center py-6 px-4">
          <div className="text-center">
            <p className="text-[9px] text-slate-700 mb-1">Sponsorlu</p>
            {/* Google AdSense kodu buraya gelecek */}
            {/* <ins className="adsbygoogle" data-ad-client="ca-pub-XXX" data-ad-slot="XXX" /> */}
            <div className="h-[60px] flex items-center justify-center">
              <p className="text-[10px] text-slate-600">Reklam Alanı</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'native') {
    return (
      <div className={`rounded-xl border border-slate-700/30 bg-gradient-to-r from-slate-800/40 to-slate-800/20 p-3 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-600 text-xs">AD</div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-slate-600 mb-0.5">Sponsorlu</p>
            {/* Native reklam içeriği buraya */}
            <p className="text-xs text-slate-500">Reklam Alanı</p>
          </div>
        </div>
      </div>
    );
  }

  // between — ürünler arasına yerleştirilen reklam
  return (
    <div className={`rounded-xl border border-dashed border-slate-700/20 bg-slate-800/10 p-4 text-center ${className}`}>
      <p className="text-[8px] text-slate-700 mb-1">Sponsorlu</p>
      {/* AdSense responsive reklam */}
      <div className="h-[50px] flex items-center justify-center">
        <p className="text-[10px] text-slate-600">Reklam Alanı</p>
      </div>
    </div>
  );
}
