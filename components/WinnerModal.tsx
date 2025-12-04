
import React from 'react';
import { GameItem } from '../types';
import { X, Star } from 'lucide-react';

interface WinnerModalProps {
  items: GameItem[];
  onClose: () => void;
}

const WinnerModal: React.FC<WinnerModalProps> = ({ items, onClose }) => {
  if (items.length === 0) return null;

  // Helper to render the specific icon/image for the reward
  const renderItemVisual = (item: GameItem) => {
    const is10K = item.name === '10K Coins';
    const is5K = item.name === '5K Coins';
    const isCoin = item.name.includes('Coins') && !is10K && !is5K;

    if (is10K) {
      return (
        <div className="flex flex-col items-center justify-center scale-110">
          <span className="text-3xl md:text-4xl font-black text-cyan-300 italic drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] leading-none" style={{ fontFamily: 'sans-serif' }}>10K</span>
          <span className="text-[10px] font-bold text-cyan-100 uppercase tracking-widest">Coins</span>
        </div>
      );
    }

    if (is5K) {
      return (
        <div className="flex flex-col items-center justify-center scale-110">
          <span className="text-3xl md:text-4xl font-black text-purple-300 italic drop-shadow-[0_0_15px_rgba(192,132,252,0.8)] leading-none" style={{ fontFamily: 'sans-serif' }}>5K</span>
          <span className="text-[10px] font-bold text-purple-100 uppercase tracking-widest">Coins</span>
        </div>
      );
    }

    if (isCoin) {
      return (
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 36 36" className="w-12 h-12 md:w-16 md:h-16 drop-shadow-[0_0_15px_rgba(234,179,8,0.6)] filter brightness-110 animate-bounce-slow">
            <circle cx="18" cy="18" r="16" fill="#eab308" stroke="#fef08a" strokeWidth="2" />
            <circle cx="18" cy="18" r="12" fill="none" stroke="#a16207" strokeWidth="1.5" strokeDasharray="3 2" />
            <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="16" fontWeight="bold" fill="#fff" style={{ textShadow: '0px 1px 2px #a16207' }}>$</text>
          </svg>
        </div>
      );
    }

    // Images (KTM, iPhone)
    return (
      <img src={item.imageUrl} alt={item.name} className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-2xl filter brightness-110" />
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

      {/* 1. Dark Overlay with Blur */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>

      {/* 2. Rotating Sunburst / God Rays Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-[200vw] h-[200vw] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(234,179,8,0.1)_20deg,transparent_40deg,rgba(234,179,8,0.1)_60deg,transparent_80deg)] animate-[spin_20s_linear_infinite] opacity-50"></div>
      </div>

      {/* 3. Main Card Container */}
      <div className="relative bg-gradient-to-b from-gray-900 via-black to-gray-900 w-full max-w-md rounded-2xl border-2 border-yellow-600/50 shadow-[0_0_50px_rgba(234,179,8,0.3)] flex flex-col items-center overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Decorative Top Header */}
        <div className="w-full h-2 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>

        {/* CONFETTI / STARS DECORATION */}
        <Star className="absolute top-4 left-4 text-yellow-500 w-6 h-6 animate-pulse" fill="currentColor" />
        <Star className="absolute top-8 right-6 text-orange-500 w-4 h-4 animate-bounce" fill="currentColor" />

        {/* HEADER TEXT */}
        <div className="mt-8 mb-2 flex flex-col items-center">
          <h2 className="text-3xl md:text-4xl font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-orange-600 drop-shadow-sm">
            CONGRATULATIONS
          </h2>
          <div className="h-1 w-24 bg-yellow-600 rounded-full mt-1"></div>
          <p className="text-gray-400 text-xs md:text-sm mt-2 uppercase tracking-widest">You Recieved</p>
        </div>

        {/* ITEMS GRID */}
        <div className="w-full px-6 py-4">
          <div className={`grid gap-3 ${items.length === 1 ? 'grid-cols-1 place-items-center' : 'grid-cols-2 md:grid-cols-3'}`}>
            {items.map((item, idx) => {
              const isRarityHigh = item.isInner || item.rarity === 'LEGENDARY' || item.rarity === 'EPIC';
              const borderColor = isRarityHigh ? 'border-yellow-500/60 bg-yellow-900/20' : 'border-gray-700 bg-gray-800/30';
              const shadowColor = isRarityHigh ? 'shadow-[0_0_15px_rgba(234,179,8,0.2)]' : '';

              return (
                <div
                  key={idx}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border ${borderColor} ${shadowColor} animate-in slide-in-from-bottom-4 fade-in duration-500 fill-mode-backwards group`}
                  style={{ animationDelay: `${idx * 100 + 200}ms` }}
                >
                  {/* Glow behind item */}
                  <div className={`absolute inset-0 bg-radial-gradient from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                  {/* Visual */}
                  <div className="mb-2 relative z-10">
                    {renderItemVisual(item)}
                  </div>

                  {/* Name & Amount */}
                  <div className="text-center z-10">
                    <p className={`text-xs md:text-sm font-bold leading-tight ${item.isInner ? 'text-yellow-400' : 'text-white'}`}>
                      {item.name.replace(/\bx\d+/, '').trim()} {/* Remove amount from name if present */}
                    </p>
                    {!item.isInner && item.amount && (
                      <p className="text-yellow-300 font-black text-sm mt-0.5">x{item.amount}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BUTTON */}
        <div className="w-full px-6 pb-8 mt-2">
          <button
            onClick={onClose}
            className="w-full py-3 relative overflow-hidden group rounded-lg bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 transition-all duration-200 shadow-lg active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12"></div>
            <span className="relative text-black font-black text-lg tracking-wide uppercase">COLLECT REWARDS</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default WinnerModal;
