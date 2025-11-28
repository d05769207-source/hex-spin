import React from 'react';

interface IPhoneTokenProps {
    size?: number;
    showLabel?: boolean;
}

const IPhoneToken: React.FC<IPhoneTokenProps> = ({ size = 20, showLabel = false }) => {
    return (
        <div className="flex items-center gap-2">
            {/* iPhone Token - Using SVG for 100% reliability */}
            <div
                className="relative flex items-center justify-center shrink-0"
                style={{
                    width: size,
                    height: size,
                    filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.3))'
                }}
            >
                <svg
                    width={size}
                    height={size}
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Outer Frame: Silver Gradient */}
                    <defs>
                        <linearGradient id="silverGrad" x1="0" y1="0" x2="0" y2="100">
                            <stop offset="0%" stopColor="#E2E8F0" />
                            <stop offset="100%" stopColor="#94A3B8" />
                        </linearGradient>
                        <linearGradient id="blueGrad" x1="0" y1="0" x2="100" y2="100">
                            <stop offset="0%" stopColor="#1E293B" />
                            <stop offset="100%" stopColor="#0F172A" />
                        </linearGradient>
                    </defs>

                    {/* Body */}
                    <rect x="5" y="5" width="90" height="90" rx="20" fill="url(#silverGrad)" />

                    {/* Screen */}
                    <rect x="15" y="15" width="70" height="70" rx="15" fill="url(#blueGrad)" />

                    {/* The "I" Letter - Extra Bold and Stroke */}
                    <text
                        x="50"
                        y="72"
                        fontSize="65"
                        fontWeight="900"
                        fontFamily="serif"
                        fill="white"
                        stroke="white"
                        strokeWidth="2"
                        textAnchor="middle"
                    >
                        I
                    </text>
                </svg>
            </div>

            {showLabel && (
                <span className="text-xs font-bold text-slate-300">iPhone Token</span>
            )}
        </div>
    );
};

export default IPhoneToken;
