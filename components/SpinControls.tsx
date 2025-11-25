
import React from 'react';

interface SpinControlsProps {
  onSpin: (count: number) => void;
  isSpinning: boolean;
  balance: number;
  isAdminMode?: boolean;
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

const SpinControls: React.FC<SpinControlsProps> = ({ onSpin, isSpinning, balance, isAdminMode = false }) => {
  return (
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
          w-40 h-14 md:w-48 md:h-16 
          bg-gradient-to-r from-cyan-600 via-blue-500 to-blue-700
          skew-x-[-20deg]
          border-t-2 border-l-2 border-cyan-300
          border-b-4 border-r-4 border-blue-900
          shadow-[0_0_20px_rgba(6,182,212,0.6)]
          flex flex-col items-center justify-center
        ">
          <div className="skew-x-[20deg] text-center">
            <div className="text-white font-bold text-lg md:text-xl drop-shadow-md leading-none">1 Spin</div>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <TokenIcon />
              <span className="text-white font-bold text-lg">1</span>
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
          w-40 h-14 md:w-48 md:h-16 
          bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-600
          skew-x-[-20deg]
          border-t-2 border-l-2 border-yellow-200
          border-b-4 border-r-4 border-orange-900
          shadow-[0_0_20px_rgba(234,179,8,0.6)]
          flex flex-col items-center justify-center
        ">
          <div className="skew-x-[20deg] text-center">
            <div className="text-black font-extrabold text-lg md:text-xl leading-none">5 Spins</div>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <TokenIcon />
              <span className="text-black font-extrabold text-lg">5</span>
            </div>
          </div>
        </div>
      </button>

    </div>
  );
};

export default SpinControls;
