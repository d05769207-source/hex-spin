import React, { memo, forwardRef } from 'react';
import { GameItem } from '../types';

interface HexagonProps {
  item: GameItem;
  isActive: boolean; // Kept for initial render/static states
  isWon: boolean;    // Kept for static winner state
  debugIndex?: number;
}

const Hexagon = memo(forwardRef<HTMLDivElement, HexagonProps>(({ item, isActive, isWon, debugIndex }, ref) => {

  let sizeClasses = '';
  let zIndex = 'z-10';

  // --- VISUAL CONFIG (Size & Z-Index) ---
  if (item.isInner) {
    if (item.id === 'inner-left' || item.id === 'inner-right') {
      sizeClasses = 'w-[75px] h-[65px] md:w-[105px] md:h-[90px]';
      zIndex = 'z-30';
    } else if (item.id === 'inner-top' || item.id === 'inner-bottom') {
      sizeClasses = 'w-[65px] h-[56px] md:w-[90px] md:h-[78px]';
      zIndex = 'z-20';
    }
  } else {
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
      strokeColor = "#fbbf24";
      gradientStart = "#f59e0b";
      gradientEnd = "#451a03";
    } else if (item.id === 'inner-right') {
      strokeColor = "#fb923c";
      gradientStart = "#ea580c";
      gradientEnd = "#7c2d12";
    } else if (item.id === 'inner-top') {
      strokeColor = "#22d3ee";
      gradientStart = "#06b6d4";
      gradientEnd = "#083344";
    } else if (item.id === 'inner-bottom') {
      strokeColor = "#c084fc";
      gradientStart = "#a855f7";
      gradientEnd = "#3b0764";
    }
  } else {
    strokeColor = "#e2e8f0";
    gradientStart = "#475569";
    gradientEnd = "#020617";
  }

  // Prepare CSS Variables for positioning
  const style = {
    '--m-x': `${item.position.x}%`,
    '--m-y': `${item.position.y}%`,
    '--d-x': `${item.desktopPosition?.x ?? item.position.x}%`,
    '--d-y': `${item.desktopPosition?.y ?? item.position.y}%`,
  } as React.CSSProperties;

  // Initial Classes based on props (for static rendering)
  // Dynamic updates will happen via direct DOM manipulation of classes
  const activeClass = isActive ? (isWon ? 'hexagon-winner' : 'hexagon-active') : '';
  const filterStyle = isActive ? undefined : 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))'; // Default shadow when inactive

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
      {/* Main Wrapper - Ref attached here for Direct DOM Manipulation */}
      <div
        ref={ref}
        className={`relative ${sizeClasses} hexagon-container group ${activeClass}`}
        style={{ filter: filterStyle }} // Inline filter only for inactive state, active overrides via CSS
      >
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

          {/* SHOCKWAVE RIPPLE LAYERS (SVG Polygons) */}
          {/* These are hidden by default via CSS and triggered by .hexagon-winner */}
          <g className="ripple-group">
            <polygon points={points} fill="none" stroke="#f59e0b" strokeWidth="2" className="ripple-polygon" />
            <polygon points={points} fill="none" stroke="#fbbf24" strokeWidth="2" className="ripple-polygon" />
            <polygon points={points} fill="none" stroke="#fcd34d" strokeWidth="2" className="ripple-polygon" />
          </g>

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

          {/* Border Stroke - Class added for CSS targeting */}
          <polygon
            points={points}
            fill="none"
            stroke={strokeColor}
            strokeWidth={item.isInner ? "3" : "2.5"}
            strokeLinejoin="round"
            className="hexagon-border drop-shadow-[0_0_3px_rgba(255,255,255,0.3)] transition-all duration-150"
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

        {/* SPARK OVERLAY - High Z-Index to be on top of everything */}
        <svg viewBox={viewBox} className="absolute inset-0 w-full h-full overflow-visible z-50 pointer-events-none">
          <g className="spark-group">
            {[...Array(12)].map((_, i) => (
              <g
                key={`spark-wrapper-${i}`}
                style={{
                  transformOrigin: '50px 43.5px',
                  transform: `rotate(${i * 30 + Math.random() * 20}deg)`
                }}
              >
                <circle
                  cx="50"
                  cy="43.5"
                  r={Math.random() * 2 + 1.5}
                  className="spark-particle"
                  style={{
                    '--dist': `${70 + Math.random() * 50}px`,
                    '--delay': `${Math.random() * 0.1}s`,
                    '--dur': `${0.6 + Math.random() * 0.4}s`
                  } as React.CSSProperties}
                />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}));

export default Hexagon;
