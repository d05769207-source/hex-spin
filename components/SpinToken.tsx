import React from 'react';

interface SpinTokenProps {
    size?: number;
    className?: string;
}

const SpinToken: React.FC<SpinTokenProps> = ({ size = 20, className = '' }) => {
    // Scale font size based on container size (approx half of size)
    const fontSize = Math.max(8, size * 0.5);

    return (
        <div
            className={`relative flex items-center justify-center shrink-0 filter drop-shadow-[0_0_5px_rgba(6,182,212,0.8)] ${className}`}
            style={{ width: size, height: size }}
        >
            <div
                className="absolute inset-0 bg-gradient-to-b from-cyan-300 via-blue-500 to-blue-700"
                style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
            />
            <div
                className="absolute inset-[1.5px] bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center"
                style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
            >
                <span
                    className="font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-200 to-cyan-500"
                    style={{
                        fontFamily: 'sans-serif',
                        fontSize: `${fontSize}px`,
                        lineHeight: 1
                    }}
                >
                    P
                </span>
            </div>
        </div>
    );
};

export default SpinToken;
