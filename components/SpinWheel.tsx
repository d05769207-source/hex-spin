import React, { useState, useRef, useCallback, memo, forwardRef, useImperativeHandle, useEffect } from 'react';
import { ITEMS } from '../constants';
import { GameItem } from '../types';
import Hexagon from './Hexagon';

export interface SpinWheelRef {
    spin: (winners: GameItem[]) => Promise<void>;
    skip: () => void;
}

interface SpinWheelProps {
    onSpinComplete: (winners: GameItem[]) => void;
    soundEnabled: boolean;
}

const SpinWheel = forwardRef<SpinWheelRef, SpinWheelProps>(({
    onSpinComplete,
    soundEnabled
}, ref) => {
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const [isSpinning, setIsSpinning] = useState<boolean>(false);
    const [wonItems, setWonItems] = useState<GameItem[]>([]);

    const currentIndexRef = useRef<number>(0);
    const isSkippingRef = useRef<boolean>(false);

    // Refs for Direct DOM Manipulation
    const hexagonRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Audio Refs
    const tickAudioRef = useRef<HTMLAudioElement | null>(null);
    const winAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        tickAudioRef.current = new Audio('/sounds/spin_tick.mp3');
        winAudioRef.current = new Audio('/sounds/win_impact.mp3');

        // Preload
        tickAudioRef.current.load();
        winAudioRef.current.load();
    }, []);

    const playTickSound = (isFast: boolean) => {
        if (!tickAudioRef.current) return;

        // For fast spin, we want to ensure it plays rapidly without cutting off too awkwardly,
        // but for a mechanical tick, resetting to 0 is usually best to get the "attack" of the sound.
        tickAudioRef.current.currentTime = 0;
        tickAudioRef.current.play().catch(() => { });
    };

    const playWinSound = () => {
        if (!winAudioRef.current) return;
        winAudioRef.current.currentTime = 0;
        winAudioRef.current.play().catch(() => { });
    };

    // Helper to wait
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper to toggle active class directly on DOM
    const toggleActiveHexagon = (index: number, isActive: boolean) => {
        const el = hexagonRefs.current[index];
        if (el) {
            if (isActive) {
                el.classList.add('hexagon-active');
            } else {
                el.classList.remove('hexagon-active');
            }
        }
    };

    const toggleWinnerHexagon = (index: number, isWinner: boolean) => {
        const el = hexagonRefs.current[index];
        if (el) {
            if (isWinner) {
                el.classList.add('hexagon-winner');
            } else {
                el.classList.remove('hexagon-winner');
            }
        }
    };

    const clearAllActive = () => {
        hexagonRefs.current.forEach(el => {
            if (el) {
                el.classList.remove('hexagon-active');
                el.classList.remove('hexagon-winner');
            }
        });
    };

    // Spin Segment Logic
    const spinToTarget = async (targetItem: GameItem, isFirst: boolean) => {
        return new Promise<void>((resolve) => {
            const targetIndex = ITEMS.findIndex(i => i.id === targetItem.id);
            let steps = 0;
            let speed = isFirst ? 50 : 15;
            let lastTickTime = performance.now();
            let animationFrameId: number;

            const current = currentIndexRef.current;
            const distance = (targetIndex - current + ITEMS.length) % ITEMS.length;
            const totalStepsNeeded = isFirst ? (30 + distance) : (distance + 14);

            const tick = (now: number) => {
                const elapsed = now - lastTickTime;

                if (elapsed >= speed) {
                    if (isSkippingRef.current) {
                        speed = 10;
                    } else if (isFirst) {
                        if (steps > totalStepsNeeded - 10) {
                            speed += 20;
                        }
                    }

                    // Deactivate previous
                    toggleActiveHexagon(currentIndexRef.current, false);

                    // Move to next
                    currentIndexRef.current = (currentIndexRef.current + 1) % ITEMS.length;

                    // Activate current (Direct DOM)
                    toggleActiveHexagon(currentIndexRef.current, true);

                    // NOTE: We DO NOT call setActiveIndex here to avoid React Re-renders!

                    if (soundEnabled) {
                        playTickSound(isSkippingRef.current || (!isFirst));
                    }

                    steps++;
                    lastTickTime = now;
                }

                if ((steps >= totalStepsNeeded && currentIndexRef.current === targetIndex)) {
                    cancelAnimationFrame(animationFrameId);
                    resolve();
                } else {
                    animationFrameId = requestAnimationFrame(tick);
                }
            };

            animationFrameId = requestAnimationFrame(tick);
        });
    };

    useImperativeHandle(ref, () => ({
        spin: async (winners: GameItem[]) => {
            if (isSpinning) return;

            isSkippingRef.current = false;
            setIsSpinning(true);
            setWonItems([]); // Clear previous winners
            clearAllActive(); // Clear any previous active states

            // Execute Sequence
            for (let i = 0; i < winners.length; i++) {
                await spinToTarget(winners[i], i === 0);

                // Vibration
                if (winners[i].isInner && window.navigator && window.navigator.vibrate) {
                    window.navigator.vibrate([100, 50, 100, 50, 100]);
                }

                if (soundEnabled) playWinSound();

                // Highlight Winner
                const winnerIndex = ITEMS.findIndex(item => item.id === winners[i].id);
                if (winnerIndex !== -1) {
                    toggleWinnerHexagon(winnerIndex, true);
                }

                const wasSkipped = isSkippingRef.current;
                isSkippingRef.current = false;
                const pauseTime = (wasSkipped || i > 0) ? 1500 : 2000; // Increased pause to let animation play
                await wait(pauseTime);
            }

            setIsSpinning(false);

            // RESET STATE: No glow after spin ends (User Request)
            setWonItems([]);
            setActiveIndex(-1);
            clearAllActive();

            onSpinComplete(winners);
        },
        skip: () => {
            if (isSpinning) {
                isSkippingRef.current = true;
            }
        }
    }));

    return (
        <div
            className="relative w-[95vw] max-w-[380px] aspect-square md:w-[420px] md:max-w-none md:h-[420px] mx-auto mt-8 mb-12"
        >
            {/* CENTRAL GLOW (BACKLIGHT) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-radial-gradient from-orange-500/20 via-transparent to-transparent z-0 pointer-events-none mix-blend-screen"></div>

            {/* THE GOLDEN FIRE RING */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[105%] h-[105%] md:w-[125%] md:h-[125%] z-0 pointer-events-none select-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[85%] bg-orange-600/20 blur-[100px] rounded-full mix-blend-screen"></div>
                <div className="absolute inset-0 animate-[spin_25s_linear_infinite]">
                    <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id="fireRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0" />
                                <stop offset="25%" stopColor="#fbbf24" stopOpacity="1" />
                                <stop offset="50%" stopColor="#ea580c" stopOpacity="0.8" />
                                <stop offset="75%" stopColor="#fbbf24" stopOpacity="1" />
                                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                            </linearGradient>
                            <filter id="fireGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>
                        <circle cx="200" cy="200" r="190" fill="none" stroke="url(#fireRingGradient)" strokeWidth="3" strokeDasharray="150 80" strokeLinecap="round" filter="url(#fireGlow)" />
                        <circle cx="200" cy="200" r="180" fill="none" stroke="#fcd34d" strokeWidth="1" strokeDasharray="4 30" opacity="0.6" />
                    </svg>
                </div>
                <div className="absolute inset-[5%] animate-[spin_18s_linear_infinite_reverse]">
                    <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
                        <circle cx="200" cy="200" r="185" fill="none" stroke="url(#fireRingGradient)" strokeWidth="2" strokeDasharray="60 100" opacity="0.7" filter="url(#fireGlow)" />
                    </svg>
                </div>
                <div className="absolute inset-[10%] rounded-full border-[1px] border-orange-500/30 shadow-[0_0_60px_rgba(234,88,12,0.2)] opacity-50"></div>
            </div>

            {/* Hexagon Grid */}
            <div className="absolute inset-0">
                {ITEMS.map((item, index) => {
                    const isWon = wonItems.some(w => w.id === item.id);
                    // Only pass isActive/isWon for initial/static states. 
                    // Animation is handled via Refs.
                    const isActive = index === activeIndex;

                    return (
                        <Hexagon
                            key={item.id}
                            ref={el => hexagonRefs.current[index] = el}
                            item={item}
                            isActive={isActive}
                            isWon={isWon}
                        />
                    );
                })}
            </div>
        </div>
    );
});

export default memo(SpinWheel);
