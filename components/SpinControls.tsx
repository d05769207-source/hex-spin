
import React from 'react';

interface SpinControlsProps {
  onSpin: (count: number) => void;
  isSpinning: boolean;
  balance: number;
  isAdminMode?: boolean;
  spinsToday: number;
  superModeEndTime: Date | null;
  superModeSpinsLeft?: number;
}

// Professional P-Token Icon (Futuristic Hexagon Chip)
// Matches the game's hexagon theme, keeping the Cyan/Blue palette
const TokenIcon = () => (
  <div className="relative w-5 h-5 md:w-6 md:h-6 flex items-center justify-center shrink-0 filter drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
    {/* Outer Frame (Cyan Gradient) */}
    <div
      className="absolute inset-0 bg-gradient-to-b from-cyan-300 via-blue-500 to-blue-700"
      style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
    />
    {/* Inner Dark Chip */}
    <div
      className="absolute inset-[1.5px] md:inset-[2px] bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center"
      style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
    >
      {/* Glowing 'P' */}
      <span className="text-[10px] md:text-[12px] font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-cyan-500 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" style={{ fontFamily: 'sans-serif' }}>P</span>
    </div>
    {/* Top Shine Reflection */}
    <div
      className="absolute top-0 w-full h-[40%] bg-gradient-to-b from-white/50 to-transparent pointer-events-none"
      style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 100%, 25% 100%)' }}
    />
  </div>
);

const SpinControls: React.FC<SpinControlsProps> = ({ onSpin, isSpinning, balance, isAdminMode = false, spinsToday, superModeEndTime, superModeSpinsLeft = 0 }) => {
  const isSuperMode = superModeSpinsLeft > 0;

  const progress = Math.min((spinsToday / 100) * 100, 100);

  return (
    <div className="w-full flex flex-col items-center gap-4 mb-4">

      {/* SUPER MODE UI */}
      <div className="w-full max-w-xs px-4">
        {isSuperMode ? (
          <div className="relative w-full bg-gradient-to-r from-purple-900/80 to-pink-900/80 rounded-xl p-3 border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <div>
                  <h3 className="text-white font-black text-sm italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-400">Super Mode Active</h3>
                  <p className="text-[10px] text-purple-200 font-bold">Lucky Re-rolls</p>
                </div>
              </div>
              <div className="bg-black/40 px-3 py-1 rounded-lg border border-purple-500/30">
                <span className="font-mono font-bold text-yellow-400 text-sm">{superModeSpinsLeft} Spins</span>
              </div>
            </div>
          </div>
        ) : (
          /* Show Daily Goal ONLY if not completed (100 spins) */
          spinsToday < 100 ? (
            <div className="w-full flex flex-col gap-1">
              <div className="flex justify-between items-end px-1">
                <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">Daily Goal</span>
                <span className="text-[10px] font-bold text-cyan-100">{spinsToday}/100 Spins</span>
              </div>
              <div className="w-full h-3 bg-slate-900/80 rounded-full overflow-hidden border border-slate-700/50 relative">
                {/* Progress Bar */}
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-500 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                </div>
              </div>
              <div className="text-center">
                <span className="text-[9px] text-gray-400">Reach 100 spins for <span className="text-yellow-400 font-bold">50 Super Spins</span></span>
              </div>
            </div>
          ) : null // Hide everything if goal is met
        )}
      </div>

      <div className="w-full max-w-2xl mx-auto flex justify-center items-end gap-4 sm:gap-12 px-4">

        {/* 1 Spin Button - Blue Crystal Shape */}
        <button
          onClick={() => onSpin(1)}
          disabled={isSpinning}
          className={`
            relative group transition-all duration-200 active:scale-95
            ${isSpinning ? 'opacity-60 grayscale' : 'hover:brightness-110'}
          `}
        >
          {/* Button Shape */}
          <div className="
            w-32 h-10 md:w-48 md:h-16 
            bg-gradient-to-r from-cyan-600 via-blue-500 to-blue-700
            skew-x-[-20deg]
            border-t-2 border-l-2 border-cyan-300
            border-b-4 border-r-4 border-blue-900
            shadow-[0_0_20px_rgba(6,182,212,0.6)]
            flex flex-col items-center justify-center
          ">
            <div className="skew-x-[20deg] text-center">
              <div className="text-white font-bold text-sm md:text-xl drop-shadow-md leading-none">1 Spin</div>
              <div className="flex items-center justify-center gap-1.5 mt-0.5 md:mt-1">
                <TokenIcon />
                <span className="text-white font-bold text-sm md:text-lg">1</span>
              </div>
            </div>
          </div>
        </button>

        {/* 5 Spins Button - Yellow Crystal Shape */}
        <button
          onClick={() => onSpin(5)}
          disabled={isSpinning}
          className={`
            relative group transition-all duration-200 active:scale-95
            ${isSpinning ? 'opacity-60 grayscale' : 'hover:brightness-110'}
          `}
        >
          {/* Button Shape */}
          <div className="
            w-32 h-10 md:w-48 md:h-16 
            bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-600
            skew-x-[-20deg]
            border-t-2 border-l-2 border-yellow-200
            border-b-4 border-r-4 border-orange-900
            shadow-[0_0_20px_rgba(234,179,8,0.6)]
            flex flex-col items-center justify-center
          ">
            <div className="skew-x-[20deg] text-center">
              <div className="text-black font-extrabold text-sm md:text-xl leading-none">5 Spins</div>
              <div className="flex items-center justify-center gap-1.5 mt-0.5 md:mt-1">
                <TokenIcon />
                <span className="text-black font-extrabold text-sm md:text-lg">5</span>
              </div>
            </div>
          </div>
        </button>

      </div>
    </div>
  );
};

export default SpinControls;
