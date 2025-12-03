
import React from 'react';
import { GameItem } from '../types';

interface HexagonProps {
  item: GameItem;
  isActive: boolean;
  isWon: boolean;
  debugIndex?: number; // Added for debugging
}

const Hexagon: React.FC<HexagonProps> = ({ item, isActive, isWon, debugIndex }) => {

  let sizeClasses = '';
  let zIndex = 'z-10';

  // --- VISUAL CONFIG (Size & Z-Index) ---
  // Mobile: Compact (75px/65px/54px)
  // Desktop: Larger & Grand for 420px container (105px/90px/74px)
  if (item.isInner) {
    if (item.id === 'inner-left' || item.id === 'inner-right') {
      // TIER 1: LARGEST (Bundles) - Left & Right
      sizeClasses = 'w-[75px] h-[65px] md:w-[105px] md:h-[90px]';
      zIndex = 'z-30';
    } else if (item.id === 'inner-top' || item.id === 'inner-bottom') {
      // TIER 2: MEDIUM (Gun & Car) - Top & Bottom
      sizeClasses = 'w-[65px] h-[56px] md:w-[90px] md:h-[78px]';
      zIndex = 'z-20';
    }
  } else {
    // TIER 3: SMALLEST (Outer Items)
    sizeClasses = 'w-[54px] h-[47px] md:w-[74px] md:h-[65px]';
    zIndex = 'z-10';
  }

  // SVG ViewBox and Points for a FLAT-TOPPED Hexagon
  const viewBox = "0 0 100 87";
  const points = "25,0 75,0 100,43.5 75,87 25,87 0,43.5";

  const uniqueId = item.id;

  // --- COLOR CONFIGURATION ---
  let strokeColor = "#9ca3af";
  let gradientStart = "#374151";
  let gradientEnd = "#111827";

  if (item.isInner) {
    if (item.id === 'inner-left') {
      // KTM - Yellow/Gold Theme
      strokeColor = "#fbbf24";
      gradientStart = "#f59e0b";
      gradientEnd = "#451a03";
    } else if (item.id === 'inner-right') {
      // iPhone - ORANGE Theme (Requested)
      strokeColor = "#fb923c"; // orange-400
      gradientStart = "#ea580c"; // orange-600
      gradientEnd = "#7c2d12"; // orange-900
    } else if (item.id === 'inner-top') {
      // 10K Coins - Cyan Theme
      strokeColor = "#22d3ee";
      gradientStart = "#06b6d4";
      gradientEnd = "#083344";
    } else if (item.id === 'inner-bottom') {
      // 5K Coins - Purple Theme
      strokeColor = "#c084fc";
      gradientStart = "#a855f7";
      gradientEnd = "#3b0764";
    }
  } else {
    // Outer Items - Metallic Silver/Dark Blue hint
    strokeColor = "#e2e8f0";
    gradientStart = "#475569";
    gradientEnd = "#020617";
  }

  // Prepare CSS Variables for positioning to handle responsive switching cleanly
  const style = {
    '--m-x': `${item.position.x}%`,
    '--m-y': `${item.position.y}%`,
    '--d-x': `${item.desktopPosition?.x ?? item.position.x}%`,
    '--d-y': `${item.desktopPosition?.y ?? item.position.y}%`,
  } as React.CSSProperties;

  // --- GLOW LOGIC ---
  // Spinning (isActive && !isWon): Normal Gold Glow
  // Stopped/Winner (isActive && isWon): Intense "Takda" Glow
  let filterStyle = 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))';
  let strokeWidth = item.isInner ? "3" : "2.5"; // Slightly thicker default borders
  let activeStrokeColor = strokeColor;

  if (isActive) {
    activeStrokeColor = "#ffd700"; // Always gold when active

    if (isWon) {
      // "TAKDA GLOW" - Only on result
      filterStyle = `drop-shadow(0 0 25px #ffd700) drop-shadow(0 0 50px #fbbf24) brightness(1.5)`;
      strokeWidth = "4";
    } else {
      // "SPIN GLOW" - Moving state (Softer)
      filterStyle = `drop-shadow(0 0 15px #ffd700) brightness(1.3)`;
      strokeWidth = "3.5";
    }
  }

  // Special render for 10K/5K Coins to look like icons
  const is10K = item.name === '10K Coins';
  const is5K = item.name === '5K Coins';

  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${zIndex}
        left-[calc(50%+var(--m-x))] top-[calc(50%+var(--m-y))]
        md:left-[calc(50%+var(--d-x))] md:top-[calc(50%+var(--d-y))]
      `}
      style={style}
    >
      {/* Main Wrapper */}
      <div
        className={`relative ${sizeClasses} group transition-transform duration-150 
          ${isActive ? 'scale-105 z-50' : 'hover:scale-105'}`}
        style={{ filter: filterStyle }}
      >
        {/* CSS Animation Style for Rising Lines & Sweep Shine */}
        <style>
          {`
              @keyframes rise {
                from { stroke-dashoffset: 20; }
                to { stroke-dashoffset: 0; }
              }
              .animate-rise {
                animation: rise 1s linear infinite;
              }
              @keyframes shine-sweep {
                0% { transform: translateX(-150%) skewX(-25deg); }
                100% { transform: translateX(250%) skewX(-25deg); }
              }
              .animate-shine {
                animation: shine-sweep 3s infinite;
              }
            `}
        </style>

        {/* SVG SHAPE */}
        <svg viewBox={viewBox} className="absolute inset-0 w-full h-full overflow-visible z-0">
          <defs>
            <radialGradient id={`grad-${uniqueId}`} cx="50%" cy="50%" r="75%" fx="50%" fy="50%">
              <stop offset="0%" stopColor={gradientStart} stopOpacity="0.8" />
              <stop offset="60%" stopColor={gradientEnd} stopOpacity="0.95" />
              <stop offset="100%" stopColor={gradientEnd} stopOpacity="1" />
            </radialGradient>

            <linearGradient id={`bevel-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.7" />
              <stop offset="15%" stopColor="white" stopOpacity="0.1" />
              <stop offset="50%" stopColor="white" stopOpacity="0" />
              <stop offset="85%" stopColor="black" stopOpacity="0.2" />
              <stop offset="100%" stopColor="black" stopOpacity="0.6" />
            </linearGradient>

            <clipPath id={`clip-${uniqueId}`}>
              <polygon points={points} />
            </clipPath>
          </defs>

          {/* Background Color */}
          <polygon
            points={points}
            fill={`url(#grad-${uniqueId})`}
          />

          {/* RISING TECH LINES (Inner Only) */}
          {item.isInner && (
            <g clipPath={`url(#clip-${uniqueId})`} className="mix-blend-plus-lighter opacity-70">
              <line x1="20" y1="100" x2="20" y2="0" stroke="white" strokeWidth="0.5" strokeDasharray="10 10" className="animate-rise" style={{ animationDuration: '1.5s' }} />
              <line x1="35" y1="100" x2="35" y2="0" stroke="white" strokeWidth="0.5" strokeDasharray="15 8" className="animate-rise" style={{ animationDuration: '2s', animationDelay: '0.2s' }} />
              <line x1="50" y1="100" x2="50" y2="0" stroke="white" strokeWidth="1" strokeDasharray="8 12" className="animate-rise" style={{ animationDuration: '1.2s', animationDelay: '0.5s' }} />
              <line x1="65" y1="100" x2="65" y2="0" stroke="white" strokeWidth="0.5" strokeDasharray="12 10" className="animate-rise" style={{ animationDuration: '1.8s', animationDelay: '0.1s' }} />
              <line x1="80" y1="100" x2="80" y2="0" stroke="white" strokeWidth="0.5" strokeDasharray="10 15" className="animate-rise" style={{ animationDuration: '2.2s', animationDelay: '0.3s' }} />
            </g>
          )}

          {/* Border Stroke */}
          <polygon
            points={points}
            fill="none"
            stroke={activeStrokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            className="drop-shadow-[0_0_3px_rgba(255,255,255,0.3)]"
          />

          {/* Glass Reflection */}
          <polygon
            points={points}
            fill={`url(#bevel-${uniqueId})`}
            className="mix-blend-overlay"
            style={{ pointerEvents: 'none' }}
          />
        </svg>

        {/* Shine Sweep Animation for Inner Items */}
        {item.isInner && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-10" style={{ clipPath: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' }}>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shine"></div>
          </div>
        )}

        {/* CONTENT LAYER */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">

          {debugIndex && (
            <div className="absolute z-50 text-white font-black text-3xl drop-shadow-md" style={{ textShadow: '0 0 4px black' }}>
              {debugIndex}
            </div>
          )}

          {/* Outer Items (Coins/Tokens) */}
          {!debugIndex && !item.isInner && (
            <>
              {item.name.includes('Coins') ? (
                <svg viewBox="0 0 36 36" className="w-5 h-5 md:w-7 md:h-7 mb-0.5 drop-shadow-[0_0_6px_rgba(234,179,8,0.8)] filter brightness-125">
                  <circle cx="18" cy="18" r="16" fill="#eab308" stroke="#fef08a" strokeWidth="2" />
                  <circle cx="18" cy="18" r="12" fill="none" stroke="#a16207" strokeWidth="1.5" strokeDasharray="3 2" />
                  <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="16" fontWeight="bold" fill="#fff" style={{ textShadow: '0px 1px 2px #a16207' }}>$</text>
                </svg>
              ) : item.name.includes('Token') ? (
                <div className="relative w-5 h-5 md:w-7 md:h-7 flex items-center justify-center filter drop-shadow-[0_0_8px_rgba(34,211,238,1)] mb-0.5">
                  <div
                    className="absolute inset-0 bg-gradient-to-b from-cyan-300 via-blue-500 to-blue-700"
                    style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
                  />
                  <div
                    className="absolute inset-[1.5px] bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center"
                    style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
                  >
                    <span className="text-[10px] md:text-[12px] font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-cyan-500" style={{ fontFamily: 'sans-serif' }}>P</span>
                  </div>
                  <div
                    className="absolute top-0 w-full h-[40%] bg-gradient-to-b from-white/50 to-transparent pointer-events-none"
                    style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 100%, 25% 100%)' }}
                  />
                </div>
              ) : null}

              {item.amount && (
                <span className={`text-[10px] md:text-xs font-bold ${item.name.includes('Coins') ? 'text-yellow-300 drop-shadow-sm' : 'text-cyan-300'}`}>
                  x{item.amount}
                </span>
              )}
            </>
          )}

          {/* Inner Items (Big Rewards) */}
          {item.isInner && !debugIndex && (
            <>
              {/* 10K Coins Render */}
              {is10K && (
                <div className="flex flex-col items-center justify-center">
                  <span className="text-xl md:text-2xl font-black text-cyan-300 italic drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] leading-none" style={{ fontFamily: 'sans-serif' }}>10K</span>
                  <span className="text-[8px] md:text-[9px] font-bold text-cyan-100 uppercase tracking-widest">Coins</span>
                </div>
              )}
              {/* 5K Coins Render */}
              {is5K && (
                <div className="flex flex-col items-center justify-center">
                  <span className="text-2xl md:text-3xl font-black text-purple-300 italic drop-shadow-[0_0_8px_rgba(192,132,252,0.8)] leading-none" style={{ fontFamily: 'sans-serif' }}>5K</span>
                  <span className="text-[8px] md:text-[10px] font-bold text-purple-100 uppercase tracking-widest">Coins</span>
                </div>
              )}

              {/* Images for KTM / iPhone */}
              {!is10K && !is5K && item.imageUrl && (
                <img src={item.imageUrl} alt={item.name} className="w-[85%] h-[85%] object-contain drop-shadow-md" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(Hexagon);
