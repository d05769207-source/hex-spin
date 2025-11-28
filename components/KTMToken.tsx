import React from 'react';
import { Bike } from 'lucide-react';

interface KTMTokenProps {
    size?: number;
    showLabel?: boolean;
}

const KTMToken: React.FC<KTMTokenProps> = ({ size = 20, showLabel = false }) => {
    return (
        <div className="flex items-center gap-2">
            {/* Orange/Black KTM Token */}
            <div
                className="relative flex items-center justify-center shrink-0 filter drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]"
                style={{ width: size, height: size }}
            >
                {/* Outer shape - Shield/Badge style */}
                <div
                    className="absolute inset-0 bg-gradient-to-b from-orange-500 to-orange-700"
                    style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                />

                {/* Inner shape */}
                <div
                    className="absolute inset-[1.5px] bg-black flex items-center justify-center"
                    style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                >
                    {/* KTM Text or Icon */}
                    <span
                        className="font-black text-orange-500 tracking-tighter"
                        style={{
                            fontSize: size * 0.4,
                            fontFamily: 'sans-serif'
                        }}
                    >
                        KTM
                    </span>
                </div>
            </div>

            {showLabel && (
                <span className="text-xs font-bold text-orange-500">KTM Token</span>
            )}
        </div>
    );
};

export default KTMToken;
