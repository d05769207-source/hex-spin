
import React from 'react';

interface ETokenProps {
    size?: number;
    showLabel?: boolean;
}

const EToken: React.FC<ETokenProps> = ({ size = 20, showLabel = false }) => {
    return (
        <div className="flex items-center gap-2">
            {/* Red Hexagon E-Token */}
            <div
                className="relative flex items-center justify-center shrink-0 filter drop-shadow-[0_0_5px_rgba(220,38,38,0.8)]"
                style={{ width: size, height: size }}
            >
                {/* Outer glow */}
                <div
                    className="absolute inset-0 bg-gradient-to-b from-red-400 to-red-600"
                    style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
                />

                {/* Inner hexagon with border effect */}
                <div
                    className="absolute inset-[1.5px] bg-gradient-to-br from-red-900 to-red-950 flex items-center justify-center"
                    style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
                >
                    <span
                        className="font-black text-transparent bg-clip-text bg-gradient-to-b from-red-200 to-red-400"
                        style={{
                            fontSize: size * 0.5,
                            fontFamily: 'sans-serif'
                        }}
                    >
                        E
                    </span>
                </div>
            </div>

            {showLabel && (
                <span className="text-xs font-bold text-red-400">E-Token</span>
            )}
        </div>
    );
};

export default EToken;
