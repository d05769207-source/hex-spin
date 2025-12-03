import React, { useState, useRef, useCallback, memo, forwardRef, useImperativeHandle, useEffect } from 'react';
import { ITEMS } from '../constants';
import { GameItem } from '../types';
import Hexagon from './Hexagon';

// --- WEB AUDIO API SYSTEM ---
const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
const audioCtx = new AudioContextClass();

const playTickSound = (isFast: boolean) => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => { });
    }

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'triangle';

    if (isFast) {
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.02);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.05, t + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
        osc.start(t);
        osc.stop(t + 0.03);
    } else {
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.start(t);
        osc.stop(t + 0.1);
    }
};

const playWinSound = () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => { });
    }

    const t = audioCtx.currentTime;

    // Layer 1: The "Thud"
    const oscLow = audioCtx.createOscillator();
    const gainLow = audioCtx.createGain();
    oscLow.connect(gainLow);
    gainLow.connect(audioCtx.destination);

    oscLow.frequency.setValueAtTime(150, t);
    oscLow.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    gainLow.gain.setValueAtTime(0.8, t);
    gainLow.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    oscLow.start(t);
    oscLow.stop(t + 0.4);

    // Layer 2: The "Clang"
    const oscHigh = audioCtx.createOscillator();
    const gainHigh = audioCtx.createGain();
    oscHigh.connect(gainHigh);
    gainHigh.connect(audioCtx.destination);

    oscHigh.type = 'triangle';
    oscHigh.frequency.setValueAtTime(600, t);
    gainHigh.gain.setValueAtTime(0.2, t);
    gainHigh.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    oscHigh.start(t);
    oscHigh.stop(t + 0.3);
};

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

            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => { });
            }

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

                const wasSkipped = isSkippingRef.current;
                isSkippingRef.current = false;
                const pauseTime = (wasSkipped || i > 0) ? 200 : 500;
                await wait(pauseTime);
            }

            setIsSpinning(false);
            setWonItems(winners); // Set winners to show glow

            // Sync React state with final position
            setActiveIndex(currentIndexRef.current);

            onSpinComplete(winners);
        },
        skip: () => {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => { });
            }
            if (isSpinning) {
                isSkippingRef.current = true;
            }
        }
    }));

    const handleScreenTap = () => {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => { });
        }
        if (isSpinning) {
            isSkippingRef.current = true;
        }
    };

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
