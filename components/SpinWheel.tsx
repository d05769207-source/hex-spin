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
    isSuperMode: boolean;
}

const SpinWheel = forwardRef<SpinWheelRef, SpinWheelProps>(({
    onSpinComplete,
    soundEnabled,
    isSuperMode
}, ref) => {
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const [isSpinning, setIsSpinning] = useState<boolean>(false);
    const [wonItems, setWonItems] = useState<GameItem[]>([]);
    const [showSkipText, setShowSkipText] = useState<boolean>(false); // New State for UI

    const currentIndexRef = useRef<number>(0);
    const isInstantSkipRef = useRef<boolean>(false); // New Ref for Logic

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
    // Spin Segment Logic
    const spinToTarget = async (targetItem: GameItem, isFirst: boolean, silent: boolean = false) => {
        return new Promise<void>((resolve) => {
            const targetIndex = ITEMS.findIndex(i => i.id === targetItem.id);
            let steps = 0;

            // Speed: Normal for first spin, Fast for silent spins
            let speed = isFirst ? 50 : (silent ? 30 : 15);

            let lastTickTime = performance.now();
            let animationFrameId: number;

            const current = currentIndexRef.current;
            const distance = (targetIndex - current + ITEMS.length) % ITEMS.length;

            // Distance: 
            // First spin: Reduced base steps from 30 to 20 for faster spin (~2s total)
            // Silent spin: ABSOLUTE MINIMUM (distance + 1) - just moves to target
            const totalStepsNeeded = isFirst ? (20 + distance) : (distance + 0);

            const tick = (now: number) => {
                // INSTANT SKIP CHECK
                if (isInstantSkipRef.current) {
                    cancelAnimationFrame(animationFrameId);
                    // Deactivate current
                    toggleActiveHexagon(currentIndexRef.current, false);
                    // Jump to target
                    currentIndexRef.current = targetIndex;
                    // Activate target
                    toggleActiveHexagon(currentIndexRef.current, true);
                    resolve();
                    return;
                }

                const elapsed = now - lastTickTime;

                if (elapsed >= speed) {
                    // Deceleration for first spin only
                    if (isFirst && steps > totalStepsNeeded - 10) {
                        speed += 15; // Reduced deceleration from 20 to 15
                    }

                    // Deactivate previous
                    toggleActiveHexagon(currentIndexRef.current, false);

                    // Move to next
                    currentIndexRef.current = (currentIndexRef.current + 1) % ITEMS.length;

                    // Activate current (Direct DOM)
                    toggleActiveHexagon(currentIndexRef.current, true);

                    // Play tick sound only if NOT silent
                    if (soundEnabled && !silent) {
                        playTickSound(false);
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

    // BOUNCE EFFECT: Forward 3, Backward 3
    const performBounce = async (targetIndex: number) => {
        return new Promise<void>(async (resolve) => {
            // FORWARD - Move away
            for (let i = 0; i < 3; i++) {
                if (isInstantSkipRef.current) { resolve(); return; } // Skip check
                toggleActiveHexagon(currentIndexRef.current, false);
                currentIndexRef.current = (currentIndexRef.current + 1) % ITEMS.length;
                toggleActiveHexagon(currentIndexRef.current, true);
                // No Sound for bounce
                await wait(50);
            }

            // APEX PAUSE - Add momentary suspension
            if (!isInstantSkipRef.current) await wait(200);

            // BACKWARD - Return to Target
            for (let i = 0; i < 3; i++) {
                if (isInstantSkipRef.current) { resolve(); return; } // Skip check
                toggleActiveHexagon(currentIndexRef.current, false);
                currentIndexRef.current = (currentIndexRef.current - 1 + ITEMS.length) % ITEMS.length;
                toggleActiveHexagon(currentIndexRef.current, true);
                // No Sound for bounce

                // If this is the LAST step (landing on target), DO NOT WAIT inside loop.
                // But we wait slightly AFTER loop to ensure visual registration.
                if (i < 2) {
                    await wait(60);
                }
            }

            // Wait a tiny bit to let "Active" state render before "Winner" state overrides it.
            // This ensures the Glow animation triggers visibly.
            await wait(50);

            resolve();
        });
    };

    // TEASE EFFECT: Go to near-miss target, pause, overshoot, then settle
    const performTease = async (targetIndex: number, teaseTargetIndex: number) => {
        return new Promise<void>(async (resolve) => {
            let current = currentIndexRef.current;

            // 1. FORWARD TO TEASE TARGET
            while (current !== teaseTargetIndex) {
                if (isInstantSkipRef.current) {
                    toggleActiveHexagon(currentIndexRef.current, false);
                    currentIndexRef.current = targetIndex;
                    toggleActiveHexagon(currentIndexRef.current, true);
                    resolve(); return;
                }

                toggleActiveHexagon(currentIndexRef.current, false);
                currentIndexRef.current = (currentIndexRef.current + 1) % ITEMS.length;
                current = currentIndexRef.current;
                toggleActiveHexagon(currentIndexRef.current, true);
                await wait(50);
            }

            // 2. PAUSE (Suspense)
            if (!isInstantSkipRef.current) await wait(400);

            // 3. BACKWARD TO REAL TARGET + OVERSHOOT (Go past it by 2 steps)
            // We want to land on (targetIndex - 2)
            const overshootIndex = (targetIndex - 2 + ITEMS.length) % ITEMS.length;

            while (current !== overshootIndex) {
                if (isInstantSkipRef.current) {
                    toggleActiveHexagon(currentIndexRef.current, false);
                    currentIndexRef.current = targetIndex;
                    toggleActiveHexagon(currentIndexRef.current, true);
                    resolve(); return;
                }

                toggleActiveHexagon(currentIndexRef.current, false);
                currentIndexRef.current = (currentIndexRef.current - 1 + ITEMS.length) % ITEMS.length;
                current = currentIndexRef.current;
                toggleActiveHexagon(currentIndexRef.current, true);

                // Fast return
                await wait(60);
            }

            // 4. SETTLE (Forward 2 steps back to Target) - "Idher udher ka rasta"
            for (let i = 0; i < 2; i++) {
                if (isInstantSkipRef.current) break;

                await wait(100); // Slow settle
                toggleActiveHexagon(currentIndexRef.current, false);
                currentIndexRef.current = (currentIndexRef.current + 1) % ITEMS.length;
                toggleActiveHexagon(currentIndexRef.current, true);
            }

            // Ensure we are exactly at target (in case of skip break or math logic)
            if (currentIndexRef.current !== targetIndex) {
                toggleActiveHexagon(currentIndexRef.current, false);
                currentIndexRef.current = targetIndex;
                toggleActiveHexagon(currentIndexRef.current, true);
            }

            // Wait a tiny bit to let "Active" state render before "Winner" state overrides it.
            await wait(50);

            resolve();
        });
    };

    // SLIP EFFECT: Instant Jump from Fake to Real (Visual "Slip")
    const performSlip = async (targetIndex: number) => {
        return new Promise<void>(async (resolve) => {
            // "Kuda de na jhar se" -> Instant Jump
            // We pause before this called, so now we just SWITCH.

            toggleActiveHexagon(currentIndexRef.current, false);
            currentIndexRef.current = targetIndex;
            toggleActiveHexagon(currentIndexRef.current, true);

            // Sound (Click/Thud)
            if (soundEnabled) playTickSound(false);

            // Tiny delay to register the visual change before the "Winner" pulse kicks in
            await wait(50);

            resolve();
        });
    };

    useImperativeHandle(ref, () => ({
        spin: async (winners: GameItem[]) => {
            if (isSpinning) return;

            isInstantSkipRef.current = false;
            setShowSkipText(false);
            setIsSpinning(true);
            setWonItems([]); // Clear previous winners
            clearAllActive(); // Clear any previous active states

            // Show "Tap to Skip" after 1 second
            const skipTimer = setTimeout(() => {
                setShowSkipText(true);
            }, 1000);

            // Execute Sequence
            for (let i = 0; i < winners.length; i++) {
                const targetItem = winners[i];
                const targetIndex = ITEMS.findIndex(item => item.id === targetItem.id);
                const isConsecutive = i > 0 && winners[i].id === winners[i - 1].id;

                if (isConsecutive) {
                    // CONSECUTIVE WIN LOGIC
                    // Reduced Chance: 10% (User: "hlka kam kar de")
                    const isTease = Math.random() < 0.10;

                    if (isTease) {
                        const teaseIndex = Math.random() > 0.5 ? 2 : 3;
                        await performTease(targetIndex, teaseIndex);
                    } else {
                        await performBounce(targetIndex);
                    }
                } else {

                    // NORMAL SPIN LOGIC (Includes Smart Super Tease)

                    let isSuperTease = false;
                    let fakeTargetIndex = -1;

                    // Smart Tease / Slip Config:
                    // 1. Works in BOTH Modes
                    // 2. Only on FIRST SPIN (i === 0)
                    // 3. Not consecutive
                    // 4. Probability: Super Mode (2%), Normal Mode (1%) - (User Request: 1 in 50 / 1 in 100)
                    if (!isConsecutive && i === 0) {

                        // Visual Neighbors Map
                        const KTM_NEIGHBORS = [13, 12, 11, 10, 0, 1, 4, 9];
                        const IPHONE_NEIGHBORS = [5, 6, 7, 8, 0, 1, 4, 9];

                        const isKtmNeighbor = KTM_NEIGHBORS.includes(targetIndex);
                        const isIphoneNeighbor = IPHONE_NEIGHBORS.includes(targetIndex);

                        // Probability Check
                        const teaseChance = isSuperMode ? 0.02 : 0.01;

                        if ((isKtmNeighbor || isIphoneNeighbor) && Math.random() < teaseChance) {
                            if (isKtmNeighbor && isIphoneNeighbor) {
                                fakeTargetIndex = Math.random() > 0.5 ? 2 : 3;
                            } else if (isKtmNeighbor) {
                                fakeTargetIndex = 2; // KTM
                            } else {
                                fakeTargetIndex = 3; // iPhone
                            }
                            isSuperTease = true;
                        }
                    }

                    if (isSuperTease) {
                        // SUPER TEASE SEQUENCE

                        // 1. Spin to Fake Target (KTM or iPhone)
                        const fakeItem = ITEMS[fakeTargetIndex];
                        await spinToTarget(fakeItem, i === 0, i > 0);

                        // 2. Shock Pause (OH MY GOD) - 600ms
                        if (!isInstantSkipRef.current) await wait(600);

                        // 3. The Slip (Instant Jump to real target)
                        await performSlip(targetIndex);

                    } else {
                        // Standard Spin
                        await spinToTarget(targetItem, i === 0, i > 0);
                    }
                }

                if (soundEnabled) playWinSound();

                // Vibration
                if (winners[i].isInner && window.navigator && window.navigator.vibrate) {
                    window.navigator.vibrate([100, 50, 100, 50, 100]);
                }

                // Highlight Winner
                const winnerIndex = ITEMS.findIndex(item => item.id === winners[i].id);
                if (winnerIndex !== -1) {
                    toggleWinnerHexagon(winnerIndex, true);

                    // Remove winner animation class after it plays once (800ms animation)
                    // This ensures it doesn't loop and returns to static active state
                    setTimeout(() => {
                        toggleWinnerHexagon(winnerIndex, false);
                    }, 1000);
                }

                // If skipped, we want to rush through everything.
                // But the loop continues. spinToTarget handles the instant jump.
                // We just need to minimize the pause time if skipped.
                const wasSkipped = isInstantSkipRef.current;

                // Pause between spins
                // If skipped, practically 0 pause (just enough to register the win sound/flash)
                // Standardized pause: 500ms for all spins
                const pauseTime = wasSkipped ? 100 : 500;
                await wait(pauseTime);
            }

            clearTimeout(skipTimer);
            setShowSkipText(false);
            setIsSpinning(false);

            // RESET STATE: No glow after spin ends (User Request)
            setWonItems([]);
            setActiveIndex(-1);
            clearAllActive();

            onSpinComplete(winners);
        },
        skip: () => {
            // Only allow skip if the text is showing (after 1s)
            if (isSpinning && showSkipText) {
                isInstantSkipRef.current = true;
                setShowSkipText(false); // Hide immediately after tapping
            }
        }
    }));

    return (
        <div
            className="relative w-[95vw] max-w-[380px] aspect-square md:w-[420px] md:max-w-none md:h-[420px] mx-auto mt-8 mb-12"
        >
            {/* CENTRAL GLOW (BACKLIGHT) */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-radial-gradient ${isSuperMode ? 'from-cyan-500/20' : 'from-orange-500/20'} via-transparent to-transparent z-0 pointer-events-none mix-blend-screen transition-colors duration-1000`}></div>

            {/* THE GOLDEN / SKY BLUE FIRE RING */}
            {/* REMOVED transition-all from parent to prevent layout shift animation on load */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[105%] h-[105%] md:w-[125%] md:h-[125%] z-0 pointer-events-none select-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[85%] ${isSuperMode ? 'bg-cyan-500/20' : 'bg-orange-600/20'} blur-[100px] rounded-full mix-blend-screen transition-colors duration-1000`}></div>
                <div className="absolute inset-0 animate-[spin_25s_linear_infinite]">
                    <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id={isSuperMode ? "blueRingGradient" : "fireRingGradient"} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={isSuperMode ? "#22d3ee" : "#fbbf24"} stopOpacity="0" />
                                <stop offset="25%" stopColor={isSuperMode ? "#22d3ee" : "#fbbf24"} stopOpacity="1" />
                                <stop offset="50%" stopColor={isSuperMode ? "#0ea5e9" : "#ea580c"} stopOpacity="0.8" />
                                <stop offset="75%" stopColor={isSuperMode ? "#22d3ee" : "#fbbf24"} stopOpacity="1" />
                                <stop offset="100%" stopColor={isSuperMode ? "#22d3ee" : "#fbbf24"} stopOpacity="0" />
                            </linearGradient>
                            <filter id="fireGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>
                        <circle cx="200" cy="200" r="190" fill="none" stroke={`url(#${isSuperMode ? "blueRingGradient" : "fireRingGradient"})`} strokeWidth="3" strokeDasharray="150 80" strokeLinecap="round" filter="url(#fireGlow)" />
                        <circle cx="200" cy="200" r="180" fill="none" stroke={isSuperMode ? "#67e8f9" : "#fcd34d"} strokeWidth="1" strokeDasharray="4 30" opacity="0.6" />
                    </svg>
                </div>
                <div className="absolute inset-[5%] animate-[spin_18s_linear_infinite_reverse]">
                    <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
                        <circle cx="200" cy="200" r="185" fill="none" stroke={`url(#${isSuperMode ? "blueRingGradient" : "fireRingGradient"})`} strokeWidth="2" strokeDasharray="60 100" opacity="0.7" filter="url(#fireGlow)" />
                    </svg>
                </div>
                <div className={`absolute inset-[10%] rounded-full border-[1px] ${isSuperMode ? 'border-cyan-500/30' : 'border-orange-500/30'} shadow-[0_0_60px_${isSuperMode ? 'rgba(6,182,212,0.4)' : 'rgba(234,88,12,0.2)'}] opacity-50 transition-colors duration-1000`}></div>
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
                            isSuperMode={isSuperMode}
                        />
                    );
                })}
            </div>

            {/* TAP TO SKIP TEXT */}
            {showSkipText && (
                <div className="absolute top-[110%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-pulse w-full text-center">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-200 to-white text-sm md:text-base font-black tracking-[0.3em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'sans-serif', textShadow: '0 0 10px rgba(234, 179, 8, 0.5)' }}>
                        Tap to Skip
                    </span>
                </div>
            )}
        </div>
    );
});

export default memo(SpinWheel);
