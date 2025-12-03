import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { ITEMS } from '../constants';
import { GameItem } from '../types';
import Hexagon from './Hexagon';

export interface SpinWheelRef {
    spinTo: (targetItem: GameItem, isFirst: boolean) => Promise<boolean>;
    reset: () => void;
    skip: () => void;
}

interface SpinWheelProps {
    isSpinning: boolean;
    showWinnerModal: boolean;
    onTick: (isFast: boolean) => void;
}

const SpinWheel = forwardRef<SpinWheelRef, SpinWheelProps>(({ isSpinning, showWinnerModal, onTick }, ref) => {
    // REMOVED: activeIndex state (Direct DOM Manipulation for 60fps)
    // const [activeIndex, setActiveIndex] = useState<number>(-1);

    const currentIndexRef = useRef<number>(0);
    const isSkippingRef = useRef<boolean>(false);

    // Helper to safely toggle classes on Hexagon elements
    const setHexagonActive = (index: number, isActive: boolean) => {
        const item = ITEMS[index];
        if (!item) return;

        // Find the inner div which has the 'hex-transition' class
        // Structure: #hex-{id} -> div.hex-transition
        const wrapper = document.getElementById(`hex-${item.id}`);
        if (wrapper) {
            const innerDiv = wrapper.firstElementChild as HTMLElement;
            if (innerDiv) {
                if (isActive) {
                    innerDiv.classList.add('hex-active');
                } else {
                    innerDiv.classList.remove('hex-active');
                }
            }
        }
    };

    const clearAllActive = () => {
        ITEMS.forEach((item) => {
            const wrapper = document.getElementById(`hex-${item.id}`);
            if (wrapper) {
                const innerDiv = wrapper.firstElementChild as HTMLElement;
                if (innerDiv) {
                    innerDiv.classList.remove('hex-active');
                    innerDiv.classList.remove('hex-won');
                }
            }
        });
    };

    useImperativeHandle(ref, () => ({
        spinTo: async (targetItem: GameItem, isFirst: boolean) => {
            return new Promise<boolean>((resolve) => {
                const targetIndex = ITEMS.findIndex(i => i.id === targetItem.id);
                let steps = 0;

                // BASE SPEED:
                // If isFirst (Item 1): 50ms start (Normal Physics)
                // If !isFirst (Items 2-5): 15ms start (Auto Fast / 10x feeling)
                let speed = isFirst ? 50 : 15;

                const current = currentIndexRef.current;
                const distance = (targetIndex - current + ITEMS.length) % ITEMS.length;

                // Steps Calculation:
                const totalStepsNeeded = isFirst ? (30 + distance) : (distance + 14);

                // Reset skip state at start of spin segment
                isSkippingRef.current = false;

                const tick = () => {
                    // Skip Logic: If user tapped, make it instant (10ms) regardless of phase
                    if (isSkippingRef.current) {
                        speed = 10; // Ultra fast
                    } else if (isFirst) {
                        // Normal deceleration only for the first item
                        if (steps > totalStepsNeeded - 10) {
                            speed += 20;
                        }
                    }

                    // Deactivate previous
                    setHexagonActive(currentIndexRef.current, false);

                    // Move to next index
                    currentIndexRef.current = (currentIndexRef.current + 1) % ITEMS.length;

                    // Activate new (Direct DOM)
                    setHexagonActive(currentIndexRef.current, true);

                    // Play sound
                    onTick(isSkippingRef.current || (!isFirst));

                    steps++;

                    // Check if done
                    if ((steps >= totalStepsNeeded && currentIndexRef.current === targetIndex)) {
                        resolve(isSkippingRef.current);
                    } else {
                        setTimeout(tick, speed);
                    }
                };

                tick();
            });
        },
        reset: () => {
            clearAllActive();
            currentIndexRef.current = 0;
        },
        skip: () => {
            if (isSpinning) {
                isSkippingRef.current = true;
            }
        }
    }), [isSpinning]);

    const handleTap = () => {
        if (isSpinning) {
            isSkippingRef.current = true;
        }
    };

    return (
        <div
            className="relative w-[95vw] max-w-[380px] aspect-square md:w-[420px] md:max-w-none md:h-[420px]"
            onClick={handleTap}
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

            {/* HEXAGON GRID */}
            {ITEMS.map((item, index) => (
                <Hexagon
                    key={item.id}
                    item={item}
                    isActive={false} // Managed by Direct DOM
                    isWon={!isSpinning && !showWinnerModal && index === currentIndexRef.current && false} // Managed by Direct DOM or Parent
                />
            ))}
        </div>
    );
});

SpinWheel.displayName = 'SpinWheel';

export default SpinWheel;
