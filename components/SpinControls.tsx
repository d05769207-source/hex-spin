
import React, { useState, useEffect } from 'react';
import { subscribeToGameStatus } from '../services/maintenanceService';

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
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  const progress = Math.min((spinsToday / 100) * 100, 100);

  // Subscribe to maintenance mode
  useEffect(() => {
    const unsubscribe = subscribeToGameStatus((status) => {
      setIsMaintenanceMode(!status.spinEnabled || status.maintenanceMode);
    });
    return () => unsubscribe();
  }, []);

  // Disable spin if in maintenance mode (unless admin)
  const isDisabled = isSpinning || (isMaintenanceMode && !isAdminMode);

  return (
    <div className="w-full flex flex-col items-center gap-4 mb-4">

      {/* SUPER MODE UI */}
      <div className="w-full max-w-xs px-4">
        {isSuperMode ? (
          <div className="w-full flex justify-center mb-2">
            <div className="relative bg-gradient-to-r from-cyan-900/60 to-blue-900/60 backdrop-blur-md rounded-full px-6 py-1.5 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.3)] flex items-center gap-3 animate-pulse">
              <span className="text-cyan-400 font-black italic tracking-widest text-xs md:text-sm drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">SUPER MODE</span>
              <div className="h-4 w-px bg-cyan-500/50"></div>
              <span className="font-mono font-bold text-white text-xs md:text-sm tracking-wider">{50 - superModeSpinsLeft}<span className="text-cyan-400/70">/50</span></span>
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

      {/* Maintenance Message */}
      {isMaintenanceMode && !isAdminMode && (
        <div className="w-full max-w-xs px-4">
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
            <p className="text-red-300 text-center text-xs md:text-sm font-bold">🛠️ Maintenance in progress. Spin disabled.</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl mx-auto flex justify-center items-end gap-4 sm:gap-12 px-4">

        {/* 1 Spin Button - Blue Crystal Shape */}
        <button
          onClick={() => onSpin(1)}
          disabled={isDisabled}
          className={`
            relative group transition-all duration-200 active:scale-95
            ${isDisabled ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:brightness-110'}
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
          disabled={isDisabled}
          className={`
            relative group transition-all duration-200 active:scale-95
            ${isDisabled ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:brightness-110'}
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
