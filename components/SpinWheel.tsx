import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import { ITEMS } from '../constants';
import { GameItem } from '../types';
import Hexagon from './Hexagon';
import SpinControls from './SpinControls';

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

interface SpinWheelProps {
    balance: number;
    isAdminMode: boolean;
    isSuperMode: boolean;
    onSpinRequest: (count: number) => Promise<GameItem[] | null>;
    onSpinComplete: (winners: GameItem[]) => void;
    soundEnabled: boolean;
}

const SpinWheel: React.FC<SpinWheelProps> = ({
    balance,
    isAdminMode,
    isSuperMode,
    onSpinRequest,
    onSpinComplete,
    soundEnabled
}) => {
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const [isSpinning, setIsSpinning] = useState<boolean>(false);
    const [wonItems, setWonItems] = useState<GameItem[]>([]);

    const currentIndexRef = useRef<number>(0);
    const isSkippingRef = useRef<boolean>(false);

    // Helper to wait
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Spin Segment Logic
    const spinToTarget = async (targetItem: GameItem, isFirst: boolean) => {
        return new Promise<void>((resolve) => {
            const targetIndex = ITEMS.findIndex(i => i.id === targetItem.id);
            let steps = 0;
            let speed = isFirst ? 50 : 15;

            const current = currentIndexRef.current;
            const distance = (targetIndex - current + ITEMS.length) % ITEMS.length;
            const totalStepsNeeded = isFirst ? (30 + distance) : (distance + 14);

            const tick = () => {
                if (isSkippingRef.current) {
                    speed = 10;
                } else if (isFirst) {
                    if (steps > totalStepsNeeded - 10) {
                        speed += 20;
                    }
                }

                currentIndexRef.current = (currentIndexRef.current + 1) % ITEMS.length;
                setActiveIndex(currentIndexRef.current);

                if (soundEnabled) {
                    playTickSound(isSkippingRef.current || (!isFirst));
                }

                steps++;

                if ((steps >= totalStepsNeeded && currentIndexRef.current === targetIndex)) {
                    resolve();
                } else {
                    setTimeout(tick, speed);
                }
            };

            tick();
        });
    };

    const handleSpinClick = useCallback(async (count: number) => {
        if (isSpinning) return;

        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => { });
        }

        isSkippingRef.current = false;

        // Request winners from parent
        const winners = await onSpinRequest(count);

        if (!winners) {
            // Balance check failed or error
            return;
        }

        setIsSpinning(true);
        setWonItems([]); // Clear previous winners

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
        onSpinComplete(winners);
        setActiveIndex(-1); // Reset active index after completion
    }, [isSpinning, onSpinRequest, onSpinComplete, soundEnabled]);

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
            className="relative w-full max-w-[420px] aspect-square mx-auto mt-8 mb-12"
            onClick={handleScreenTap}
        >
            {/* Hexagon Grid */}
            <div className="absolute inset-0">
                {ITEMS.map((item, index) => {
                    const isWon = wonItems.some(w => w.id === item.id);
                    return (
                        <Hexagon
                            key={item.id}
                            item={item}
                            isActive={index === activeIndex}
                            isWon={isWon}
                        />
                    );
                })}
            </div>

            {/* Center Controls */}
            <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                <div className="pointer-events-auto">
                    <SpinControls
                        onSpin={handleSpinClick}
                        disabled={isSpinning}
                        balance={balance}
                        isAdminMode={isAdminMode}
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(SpinWheel);
