import React from 'react';

interface IPhoneTokenProps {
    size?: number;
    showLabel?: boolean;
}

const IPhoneToken: React.FC<IPhoneTokenProps> = ({ size = 20, showLabel = false }) => {
    return (
        <div className="flex items-center gap-2">
            {/* iPhone Token - Using SVG for Apple Logo */}
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

                    {/* Body - Thinner Border */}
                    <rect x="2" y="2" width="96" height="96" rx="22" fill="url(#silverGrad)" />

                    {/* Screen - Larger Area */}
                    <rect x="8" y="8" width="84" height="84" rx="18" fill="url(#blueGrad)" />

                    {/* Apple Logo Path - High Quality & Centered & Larger */}
                    <path
                        d="M66.07 46.73c-0.23-3.86 3.16-5.73 3.3-5.81 -1.8-2.63-4.61-2.99-5.61-3.03 -2.36-0.24-4.61 1.39-5.81 1.39 -1.2 0-3.04-1.36-5.01-1.32 -2.58 0.04-4.96 1.5-6.29 3.81 -2.68 4.65-0.69 11.53 1.93 15.31 1.28 1.84 2.8 3.91 4.8 3.84 1.92-0.08 2.65-1.24 4.97-1.24 2.32 0 2.97 1.24 5.01 1.2 2.07-0.04 3.38-1.87 4.65-3.72 1.46-2.14 2.06-4.21 2.09-4.32 -0.05-0.02-4.03-1.55-4.03-6.11zM58.07 33.15c1.17-1.41 1.96-3.37 1.74-5.33 -1.69 0.07-3.73 1.12-4.94 2.54 -1.08 1.25-2.03 3.26-1.77 5.18 1.88 0.15 3.8-0.98 4.97-2.39z"
                        fill="white"
                        transform="translate(-58, -38) scale(1.90)"
                    />
                </svg>
            </div>

            {showLabel && (
                <span className="text-xs font-bold text-slate-300">iPhone Token</span>
            )}
        </div>
    );
};

export default IPhoneToken;
