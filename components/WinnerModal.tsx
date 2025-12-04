
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
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4">

      {/* 1. Dark Overlay with Blur */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}></div>

      {/* 2. Content Container (No Box) */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center animate-in zoom-in-95 duration-300 gap-8 md:gap-12">

        {/* HEADER */}
        <div className="flex flex-col items-center text-center">
          <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-orange-600 drop-shadow-[0_2px_10px_rgba(234,179,8,0.5)]">
            CONGRATULATIONS
          </h2>
          <p className="text-yellow-200/80 text-xs md:text-sm mt-2 uppercase tracking-[0.2em] font-medium">
            You Received Rewards
          </p>
        </div>

        {/* ITEMS ROW */}
        <div className="w-full flex justify-center">
          <div className="flex flex-row flex-wrap justify-center items-end gap-2 md:gap-6">
            {items.map((item, idx) => {
              const isRarityHigh = item.isInner || item.rarity === 'LEGENDARY' || item.rarity === 'EPIC';
              // Rarity Colors for bottom border
              const borderClass = item.isInner ? 'border-purple-500' :
                item.name.includes('Coins') ? 'border-yellow-500' :
                  'border-cyan-500';

              const glowColor = item.isInner ? 'rgba(168,85,247,0.4)' :
                item.name.includes('Coins') ? 'rgba(234,179,8,0.4)' :
                  'rgba(6,182,212,0.4)';

              return (
                <div
                  key={idx}
                  className="relative flex flex-col items-center group animate-in slide-in-from-bottom-8 fade-in duration-500 fill-mode-backwards"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {/* Item Container */}
                  <div
                    className={`relative w-[16vw] h-[16vw] max-w-[100px] max-h-[100px] md:w-32 md:h-32 bg-gradient-to-b from-white/5 to-white/0 flex items-center justify-center border-b-4 ${borderClass}`}
                    style={{
                      boxShadow: `0 10px 20px -5px ${glowColor}`
                    }}
                  >
                    {/* Visual */}
                    <div className="scale-75 md:scale-90 transition-transform duration-300 group-hover:scale-100">
                      {renderItemVisual(item)}
                    </div>

                    {/* Quantity Badge - No Box, Bottom Right */}
                    {!item.isInner && item.amount && (
                      <div className="absolute -bottom-2 right-1 md:-bottom-2 md:right-2">
                        <span className={`text-[10px] md:text-sm font-black ${item.name.includes('Coins') ? 'text-yellow-400' : 'text-cyan-400'} drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]`} style={{ textShadow: '0 0 4px rgba(0,0,0,1)' }}>
                          x{item.amount}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name (Optional - kept minimal) */}
                  <div className="mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute -bottom-6 w-full">
                    {/* Hidden by default to keep it clean, shown on hover if needed, or just remove if 'simple' means NO text */}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BUTTON */}
        <div className="mt-4">
          <button
            onClick={onClose}
            className="px-12 py-3 bg-white text-black font-black text-lg md:text-xl uppercase tracking-widest hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)] clip-path-button"
            style={{ clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)' }}
          >
            OK
          </button>
        </div>

      </div>
    </div>
  );
};

export default WinnerModal;
