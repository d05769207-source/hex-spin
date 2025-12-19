import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import '../index.css'; // Ensure we have access to global styles

const LoadingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [progress, setProgress] = useState(0);
    const [loadingText, setLoadingText] = useState('Initializing Game Engine...');

    useEffect(() => {
        // Simulate loading progress
        const interval = setInterval(() => {
            setProgress((prev) => {
                const next = prev + Math.random() * 5;
                if (next >= 100) {
                    clearInterval(interval);
                    setTimeout(onComplete, 500); // Small delay before finishing
                    return 100;
                }
                return next;
            });
        }, 100);

        // Dynamic loading text
        const textInterval = setInterval(() => {
            const texts = [
                'Loading Assets...',
                'Connecting to Server...',
                'Preparing Battleground...',
                'Syncing Player Data...',
                'Almost Ready...'
            ];
            setLoadingText(texts[Math.floor(Math.random() * texts.length)]);
        }, 800);

        return () => {
            clearInterval(interval);
            clearInterval(textInterval);
        };
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center overflow-hidden">
            {/* Background Video (Muted, Loop) */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-60"
            >
                <source src="/animation/background.mp4" type="video/mp4" />
            </video>

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-md px-6">
                {/* Animated Logo Container */}
                <div className="mb-12 relative">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.6)] animate-pulse">
                        <span className="text-4xl md:text-5xl font-black text-white italic tracking-tighter transform -skew-x-12">
                            HS
                        </span>
                    </div>
                    {/* Glitch Effect Duplicate (Decoration) */}
                    <div className="absolute inset-0 w-24 h-24 md:w-32 md:h-32 bg-red-500 rounded-2xl flex items-center justify-center opacity-30 animate-ping" style={{ animationDuration: '3s' }}>
                    </div>
                </div>

                {/* Game Title */}
                <h1 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-widest mb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                    HEX<span className="text-cyan-400">SPIN</span>
                </h1>
                <p className="text-gray-400 text-sm font-bold tracking-[0.2em] uppercase mb-16">
                    Battle Royale Edition
                </p>

                {/* Progress Bar Container */}
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden backdrop-blur-sm border border-white/5 mb-4 relative">
                    {/* Animated Progress Fill */}
                    <div
                        className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 transition-all duration-200 ease-out shadow-[0_0_20px_rgba(6,182,212,0.8)]"
                        style={{ width: `${progress}%` }}
                    />
                    {/* Shine Effect on Bar */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/2 translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                </div>

                {/* Loading Details */}
                <div className="flex items-center justify-between w-full text-xs font-mono">
                    <span className="text-cyan-400 flex items-center gap-2">
                        <Loader2 className="animate-spin w-3 h-3" />
                        {loadingText}
                    </span>
                    <span className="text-white font-bold">{Math.round(progress)}%</span>
                </div>

                {/* Version Info */}
                <div className="absolute bottom-[-10vh] text-gray-600 text-[10px] font-mono">
                    v2.4.0.15 (RELEASE)
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
