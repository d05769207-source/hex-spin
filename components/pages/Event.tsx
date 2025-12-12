import React, { useState, useEffect, useRef } from 'react';
import PrizeImage from '../PrizeImage';
import { soundManager } from '../../utils/SoundManager';
import { getCurrentTime } from '../../utils/weekUtils';
import EToken from '../EToken';
import KTMToken from '../KTMToken';
import IPhoneToken from '../iPhoneToken';
import SpinToken from '../SpinToken';
import { db } from '../../firebase';
import { doc, onSnapshot, Timestamp, updateDoc, runTransaction, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

type EventState = 'JOINING' | 'IPHONE_DRAW' | 'IPHONE_WINNER' | 'KTM_WAITING' | 'KTM_DRAW' | 'KTM_WINNER' | 'ENDED';

interface LotteryEventData {
    iphone_start: Timestamp;
    iphone_end: Timestamp;
    ktm_start: Timestamp;
    ktm_end: Timestamp;
    iphone_winner: { number: number; name: string } | null;
    ktm_winner: { number: number; name: string } | null;
    status: 'WAITING' | 'LIVE_IPHONE' | 'LIVE_KTM' | 'ENDED';
}

interface EventProps {
    isAdminMode?: boolean;
    onTriggerAdmin?: () => void;
}

interface JoiningViewProps {
    ktmEntry: number | null;
    iphoneEntry: number | null;
    onJoinKTM: () => void;
    onJoinIPhone: () => void;
    onViewDraw: (prize: 'iPhone' | 'KTM') => void;
    eventData: LotteryEventData | null;
}

const JoiningView: React.FC<JoiningViewProps> = ({ ktmEntry, iphoneEntry, onJoinKTM, onJoinIPhone, onViewDraw, eventData }) => {
    const [timeUntilDraw, setTimeUntilDraw] = useState('');

    useEffect(() => {
        const updateCountdown = () => {
            if (!eventData) return;

            const now = getCurrentTime();

            // Determine which draw is next
            const iphoneStart = eventData.iphone_start.toDate();
            const ktmStart = eventData.ktm_start.toDate();

            let targetDate = iphoneStart;
            let label = "iPhone Draw";

            if (now > iphoneStart && now < ktmStart) {
                targetDate = ktmStart;
                label = "KTM Draw";
            } else if (now > ktmStart) {
                // Next week
                targetDate = new Date(iphoneStart);
                targetDate.setDate(targetDate.getDate() + 7);
            }

            const diff = targetDate.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeUntilDraw('Draw Starting...');
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);

            if (days > 0) {
                setTimeUntilDraw(`${days}d ${hours}h`);
            } else if (hours > 0) {
                setTimeUntilDraw(`${hours}h ${minutes}m`);
            } else {
                setTimeUntilDraw(`${minutes}m ${Math.floor((diff / 1000) % 60)}s`);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [eventData]);

    return (
        <div className="p-4 space-y-4">
            <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 px-4 py-1.5 rounded-full border border-amber-500/20 mb-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-amber-500 tracking-wider uppercase">Live Event</span>
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                    SUNDAY <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">LOTTERY</span>
                </h1>
                <p className="text-[10px] text-gray-400 mt-1 font-medium">Draw starts in <span className="text-amber-400 font-bold">{timeUntilDraw}</span></p>
            </div>

            <div className="grid gap-3">
                {/* iPhone Card */}
                <div className="relative group overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 p-3">
                    <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors duration-500" />
                    <div className="relative flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded text-[10px]">7:00 PM</span>
                            </div>
                            <h3 className="text-lg font-black text-white leading-tight">Win iPhone 15</h3>
                            <p className="text-[10px] text-indigo-200/70 truncate">Pro Max 256GB Titanium</p>

                            {iphoneEntry ? (
                                <div className="mt-2 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-black/40 px-3 py-1 rounded border border-indigo-500/30">
                                            <span className="text-xs font-mono text-indigo-300 tracking-widest">{iphoneEntry.toString().padStart(6, '0')}</span>
                                        </div>
                                        <span className="text-[10px] text-green-400 font-bold">✓ Joined</span>
                                    </div>
                                    <button
                                        onClick={() => onViewDraw('iPhone')}
                                        disabled={eventData?.status !== 'LIVE_IPHONE' && eventData?.status !== 'LIVE_KTM' && eventData?.status !== 'ENDED'}
                                        // Allow view if LIVE or ENDED (to see results), but specifically user asked for 'LIVE' to view draw. 
                                        // Actually, if it's ENDED, we might want to allow viewing results too.
                                        // User logic: "jab live ho tab hi view drow ka option aaye"
                                        // Let's stick strictly to what user asked: Only if LIVE.
                                        // But wait, if iphone draw is over (LIVE_KTM), they might still want to see iphone winner?
                                        // Let's enable it if status is LIVE_IPHONE for now.
                                        // If status is LIVE_KTM, iPhone is arguably 'done', but maybe we still allow viewing?
                                        // The user's complaint is about "draw starts". 
                                        // Let's simply change the text and action:
                                        // If LIVE_IPHONE -> Active "VIEW LIVE DRAW"
                                        // If ENDED or Past -> "VIEW WINNER" (maybe)
                                        // If WAITING -> "COMING SOON"
                                        className={`w-full text-[10px] font-bold py-1.5 rounded border transition-all ${eventData?.status === 'LIVE_IPHONE'
                                            ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border-indigo-500/30 cursor-pointer animate-pulse'
                                            : 'bg-gray-800/50 text-gray-500 border-gray-700 cursor-not-allowed'
                                            }`}
                                    >
                                        {eventData?.status === 'LIVE_IPHONE' ? '● VIEW LIVE DRAW' : 'COMING SOON'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={onJoinIPhone}
                                    className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded shadow-lg shadow-indigo-900/20 transition-all active:scale-95"
                                >
                                    Join for Free
                                </button>
                            )}
                        </div>
                        <div className="w-16 h-16 flex-shrink-0 drop-shadow-2xl">
                            <PrizeImage prize="iPhone" size="md" />
                        </div>
                    </div>
                </div>

                {/* KTM Card */}
                <div className="relative group overflow-hidden rounded-xl bg-gradient-to-br from-orange-900/40 to-red-900/40 border border-orange-500/20 p-3">
                    <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-orange-500/10 transition-colors duration-500" />
                    <div className="relative flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-orange-300 bg-orange-500/10 px-2 py-0.5 rounded text-[10px]">8:00 PM</span>
                            </div>
                            <h3 className="text-lg font-black text-white leading-tight">Win KTM RC</h3>
                            <p className="text-[10px] text-orange-200/70 truncate">RC 390 GP Edition</p>

                            {ktmEntry ? (
                                <div className="mt-2 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-black/40 px-3 py-1 rounded border border-orange-500/30">
                                            <span className="text-xs font-mono text-orange-300 tracking-widest">{ktmEntry.toString().padStart(6, '0')}</span>
                                        </div>
                                        <span className="text-[10px] text-green-400 font-bold">✓ Joined</span>
                                    </div>
                                    <button
                                        onClick={() => onViewDraw('KTM')}
                                        disabled={eventData?.status !== 'LIVE_KTM'}
                                        className={`w-full text-[10px] font-bold py-1.5 rounded border transition-all ${eventData?.status === 'LIVE_KTM'
                                            ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border-orange-500/30 cursor-pointer animate-pulse'
                                            : 'bg-gray-800/50 text-gray-500 border-gray-700 cursor-not-allowed'
                                            }`}
                                    >
                                        {eventData?.status === 'LIVE_KTM' ? '● VIEW LIVE DRAW' : 'COMING SOON'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={onJoinKTM}
                                    className="mt-2 w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-xs font-bold py-2 rounded shadow-lg shadow-orange-900/20 transition-all active:scale-95"
                                >
                                    Join for Free
                                </button>
                            )}
                        </div>
                        <div className="w-16 h-16 flex-shrink-0 drop-shadow-2xl">
                            <PrizeImage prize="KTM" size="md" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="text-center pt-2 mt-auto">
                <p className="text-[10px] text-gray-500">Winners announced automatically • 100% Free Entry</p>
            </div>

        </div>
    );
};

interface DrawViewProps {
    prize: 'iPhone' | 'KTM';
    onBack?: () => void;
    winnerData?: { number: number; name: string } | null;
    startTime?: Timestamp;
}

const DrawView: React.FC<DrawViewProps> = ({ prize, onBack, winnerData, startTime }) => {

    // Interval calculation: 10 minutes = 600 seconds. 6 Reels.
    // 100 seconds (1m 40s) per reel.
    const REEL_INTERVAL_MS = 100 * 1000;

    // Initialize state
    const [reels, setReels] = useState<number[]>([0, 0, 0, 0, 0, 0]);
    const [isSpinning, setIsSpinning] = useState<boolean[]>([true, true, true, true, true, true]);
    const [muted, setMuted] = useState(false);

    // Audio Initialization
    useEffect(() => {
        return () => {
            soundManager.stopAll();
        };
    }, []);

    useEffect(() => {
        soundManager.mute(muted);
        if (!muted && isSpinning.some(s => s)) {
            soundManager.play('spin_loop', { loop: true, volume: 0.5 });
        } else {
            soundManager.stop('spin_loop');
        }
    }, [muted, isSpinning]);

    useEffect(() => {
        if (!winnerData || !startTime) {
            return;
        }

        const now = getCurrentTime().getTime();
        const start = startTime.toDate().getTime();
        const elapsed = now - start;

        const winnerStr = winnerData.number.toString().padStart(6, '0');
        const digits = winnerStr.split('').map(Number);

        const newIsSpinning = [...isSpinning];
        const newReels = [...reels];
        const timeouts: NodeJS.Timeout[] = [];

        // Determine state for each reel
        digits.forEach((digit, index) => {
            const stopTime = (index + 1) * REEL_INTERVAL_MS;
            const timeUntilStop = stopTime - elapsed;

            if (timeUntilStop <= 0) {
                // Already passed
                newIsSpinning[index] = false;
                newReels[index] = digit;
            } else {
                // Future stop
                newIsSpinning[index] = true;

                const id = setTimeout(() => {
                    setIsSpinning(prev => {
                        const next = [...prev];
                        next[index] = false;
                        return next;
                    });
                    setReels(prev => {
                        const next = [...prev];
                        next[index] = digit;
                        return next;
                    });

                    // Play stop sound
                    if (!muted) soundManager.play('reel_stop', { volume: 0.8 });

                    // Win Fanfare if last reel
                    if (index === 5 && !muted) {
                        setTimeout(() => soundManager.play('win_fanfare', { volume: 1.0 }), 500);
                    }

                }, timeUntilStop);
                timeouts.push(id);
            }
        });

        setIsSpinning(newIsSpinning);
        setReels(prev => {
            const next = [...prev];
            newIsSpinning.forEach((spinning, i) => {
                if (!spinning) next[i] = digits[i];
            });
            return next;
        });

        return () => timeouts.forEach(clearTimeout);
    }, [winnerData, startTime]);

    // Animation effect for spinning reels (Visual only)
    useEffect(() => {
        const intervals: NodeJS.Timeout[] = [];

        reels.forEach((_, index) => {
            if (isSpinning[index]) {
                const interval = setInterval(() => {
                    setReels(prev => {
                        const newReels = [...prev];
                        // Only randomize if still spinning
                        if (isSpinning[index]) {
                            newReels[index] = Math.floor(Math.random() * 10);
                        }
                        return newReels;
                    });
                }, 50 + (index * 10));
                intervals.push(interval);
            }
        });

        return () => intervals.forEach(clearInterval);
    }, [isSpinning]);

    const isIphone = prize === 'iPhone';

    return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center relative">
            {/* Back Button */}
            <button
                onClick={onBack}
                className="absolute top-2 left-2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-20 flex items-center gap-1"
            >
                <span className="text-lg">←</span>
            </button>

            {/* Mute Button */}
            <button
                onClick={() => setMuted(!muted)}
                className="absolute top-2 right-2 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-20"
            >
                {muted ? '🔇' : '🔊'}
            </button>

            <div className="mb-8 relative animate-bounce-slow">
                <div className={`absolute inset-0 blur-2xl opacity-30 ${isIphone ? 'bg-indigo-500' : 'bg-orange-500'}`} />
                <PrizeImage prize={prize} size="lg" />
            </div>

            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                {isIphone ? 'iPHONE' : 'KTM'} <span className={isIphone ? 'text-indigo-400' : 'text-orange-400'}>DRAW</span>
            </h2>
            <p className="text-xs text-gray-400 mb-8 font-medium tracking-wide uppercase">
                {isSpinning.some(s => s) ? 'Finding Lucky Winner...' : 'Winner Found!'}
            </p>

            {/* 6-Reel Slot Machine */}
            <div className="flex gap-2 mb-8 p-4 bg-black/40 rounded-xl border border-white/10 shadow-inner">
                {reels.map((num, index) => (
                    <div
                        key={index}
                        className={`
                            relative w-10 h-14 md:w-12 md:h-16 
                            bg-gradient-to-b from-gray-800 to-black 
                            rounded-lg border border-white/10 
                            flex items-center justify-center 
                            overflow-hidden shadow-lg
                            ${!isSpinning[index] ? (isIphone ? 'border-indigo-500/50 shadow-indigo-500/20' : 'border-orange-500/50 shadow-orange-500/20') : ''}
                        `}
                    >
                        {/* Spinning Blur Effect */}
                        {isSpinning[index] && (
                            <div className="absolute inset-0 bg-white/5 blur-sm animate-pulse" />
                        )}

                        <span className={`
                            text-2xl md:text-3xl font-mono font-black 
                            ${isSpinning[index] ? 'text-gray-400 blur-[1px]' : (isIphone ? 'text-indigo-400' : 'text-orange-400')}
                            transition-all duration-300
                        `}>
                            {num}
                        </span>

                        {/* Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                    </div>
                ))}
            </div>

            {/* Status Indicator */}
            <div className={`
                px-6 py-2 rounded-full border 
                ${isSpinning.some(s => s)
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    : 'bg-green-500/10 border-green-500/30 text-green-400'}
            `}>
                <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    {isSpinning.some(s => s) ? (
                        <>
                            <span className="animate-spin">⚙️</span> DRAWING...
                        </>
                    ) : (
                        <>
                            <span>🎉</span> DRAW COMPLETE
                        </>
                    )}
                </p>
            </div>
        </div>
    );
};

const WinnerView: React.FC<DrawViewProps> = ({ prize, winnerData }) => {
    const defaultWinner = { number: 0, name: 'Finding Winner...' };
    const displayWinner = winnerData || defaultWinner;
    const isIphone = prize === 'iPhone';

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-transparent" />

            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-green-600 mb-6 animate-bounce">
                WINNER!
            </h2>

            <div className="relative z-10 w-full max-w-[260px]">
                <div className="bg-gradient-to-b from-green-900/40 to-black/40 rounded-xl p-6 border border-green-500/30 backdrop-blur-sm shadow-2xl shadow-green-900/20">
                    <div className="flex justify-center mb-4">
                        <PrizeImage prize={prize} size="sm" />
                    </div>
                    <p className="text-4xl font-mono font-black text-white mb-2 tracking-wider">
                        {displayWinner.number.toString().padStart(6, '0')}
                    </p>
                    <div className="h-px w-16 bg-green-500/30 mx-auto mb-3" />
                    <p className="text-lg font-bold text-green-400">
                        {displayWinner.name}
                    </p>
                    <p className="text-[10px] text-green-500/60 mt-1 uppercase tracking-widest">Congratulations</p>
                </div>
            </div>

            {isIphone && (
                <div className="mt-8 animate-pulse">
                    <p className="text-[10px] text-gray-400">Up Next</p>
                    <p className="text-sm font-bold text-orange-400">KTM Draw at 8:00 PM</p>
                </div>
            )}
        </div>
    );
};

const WaitingView: React.FC = () => {
    const [timeUntilKTM, setTimeUntilKTM] = useState('');

    useEffect(() => {
        const updateCountdown = () => {
            const now = getCurrentTime();
            const ktmTime = new Date(now);
            ktmTime.setHours(20, 0, 0, 0);
            const diff = ktmTime.getTime() - now.getTime();
            const minutes = Math.floor(diff / (1000 * 60));
            const seconds = Math.floor((diff / 1000) % 60);
            setTimeUntilKTM(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        };
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
                <PrizeImage prize="KTM" size="xl" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">KTM DRAW</h2>
            <div className="bg-orange-500/10 rounded-lg px-6 py-3 border border-orange-500/20">
                <p className="text-[10px] text-orange-300 mb-1 uppercase tracking-wider">Starting In</p>
                <p className="text-3xl font-mono font-black text-orange-400">{timeUntilKTM}</p>
            </div>
        </div>
    );
};

const EndedView: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                <span className="text-2xl">👋</span>
            </div>
            <h2 className="text-xl font-black text-white mb-2">Event Ended</h2>
            <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">
                Thanks for participating! Join us again next Sunday for more prizes.
            </p>
        </div>
    );
};

// Helper function for time restriction
const checkLotteryTimeRestriction = (): { allowed: boolean; message?: string } => {
    const now = getCurrentTime();
    const isSunday = now.getDay() === 0;

    if (isSunday) {
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const currentMinutes = hours * 60 + minutes;

        // 6:50 PM = 18:50 = 1130 minutes
        // 9:00 PM = 21:00 = 1260 minutes
        const START_BLOCK = 18 * 60 + 50; // 1130
        const END_BLOCK = 21 * 60; // 1260

        if (currentMinutes >= START_BLOCK && currentMinutes < END_BLOCK) {
            return {
                allowed: false,
                message: "Entries are closed from 6:50 PM to 9:00 PM for the live draw! Please try again later."
            };
        }
    }
    return { allowed: true };
};

const SundayLotteryView: React.FC<EventProps & { onBack: () => void, eventData: LotteryEventData | null }> = ({ isAdminMode = false, onTriggerAdmin, onBack, eventData }) => {
    const [eventState, setEventState] = useState<EventState>('JOINING');
    const [ktmEntry, setKtmEntry] = useState<number | null>(null);
    const [iphoneEntry, setIphoneEntry] = useState<number | null>(null);

    // Automation Logic (Crowd Trigger for Offline Support)
    useEffect(() => {
        if (!eventData) return;

        const checkAutomation = async () => {
            const now = getCurrentTime();
            const { iphone_start, iphone_end, ktm_start, ktm_end, status, iphone_winner, ktm_winner } = eventData;

            const tIphoneStart = iphone_start.toDate();
            const tIphoneEnd = iphone_end.toDate();
            const tKtmStart = ktm_start.toDate();
            const tKtmEnd = ktm_end.toDate();

            try {
                // 1. Trigger iPhone LIVE & PICK WINNER (7:00 PM)
                if (status === 'WAITING' && now >= tIphoneStart && now < tIphoneEnd && !iphone_winner) {
                    await runTransaction(db, async (transaction) => {
                        const sfDocRef = doc(db, "events", "sunday_lottery");
                        const sfDoc = await transaction.get(sfDocRef);
                        if (!sfDoc.exists()) return;

                        if (!sfDoc.data().iphone_winner) {
                            const randomNum = Math.floor(Math.random() * 900000) + 100000;
                            transaction.update(sfDocRef, {
                                status: 'LIVE_IPHONE',
                                iphone_winner: { number: randomNum, name: 'Lucky Winner' },
                                last_updated: Timestamp.now()
                            });
                            console.log('🤖 Auto-Trigger: iPhone LIVE + Winner Picked', randomNum);
                        }
                    });
                }

                // 2. Transition iPhone to WAITING (After Time Ended)
                // Note: No separate winner pick step anymore.
                else if (status === 'LIVE_IPHONE' && iphone_winner) {
                    // Check if we are past the end time AND some buffer (e.g. 60s)
                    const timeSinceEnd = now.getTime() - tIphoneEnd.getTime();

                    if (now > tIphoneEnd && timeSinceEnd > 60000) {
                        await updateDoc(doc(db, 'events', 'sunday_lottery'), { status: 'WAITING' });
                        console.log('🤖 Auto-Trigger: iPhone Event Ended (Transition to WAITING)');
                    }
                }

                // 3. Trigger KTM LIVE & PICK WINNER (8:00 PM)
                else if (status === 'WAITING' && now >= tKtmStart && now < tKtmEnd && !ktm_winner) {
                    await runTransaction(db, async (transaction) => {
                        const sfDocRef = doc(db, "events", "sunday_lottery");
                        const sfDoc = await transaction.get(sfDocRef);
                        if (!sfDoc.exists()) return;

                        if (!sfDoc.data().ktm_winner) {
                            const randomNum = Math.floor(Math.random() * 900000) + 100000;
                            transaction.update(sfDocRef, {
                                status: 'LIVE_KTM',
                                ktm_winner: { number: randomNum, name: 'Lucky Winner' },
                                last_updated: Timestamp.now()
                            });
                            console.log('🤖 Auto-Trigger: KTM LIVE + Winner Picked', randomNum);
                        }
                    });
                }

                // 4. Transition KTM to ENDED (After Time Ended)
                else if (status === 'LIVE_KTM' && ktm_winner) {
                    const timeSinceEnd = now.getTime() - tKtmEnd.getTime();

                    if (now > tKtmEnd && timeSinceEnd > 60000) {
                        await updateDoc(doc(db, 'events', 'sunday_lottery'), { status: 'ENDED' });
                        console.log('🤖 Auto-Trigger: KTM Event Ended');
                    }
                }

            } catch (err) {
                console.error("Auto-Trigger Error:", err);
            }
        };

        const interval = setInterval(checkAutomation, 30000); // Check every 30s
        checkAutomation(); // Run immediately
        return () => clearInterval(interval);
    }, [eventData]);

    // Update state based on props change
    useEffect(() => {
        if (eventData) {
            switch (eventData.status) {
                case 'ENDED':
                    setEventState('ENDED');
                    break;
                case 'WAITING':
                    if (eventState !== 'JOINING') setEventState('JOINING');
                    break;
                default:
                    break;
            }
        }
    }, [eventData]); // Depend on eventData prop

    // Long Press Logic
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const handlePressStart = () => {
        timerRef.current = setTimeout(() => {
            if (onTriggerAdmin) {
                if (navigator.vibrate) navigator.vibrate(200);
                onTriggerAdmin();
            }
        }, 5000);
    };
    const handlePressEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    useEffect(() => {
        soundManager.load({
            spin_loop: '/sounds/spin_loop.mp3',
            reel_stop: '/sounds/reel_stop.mp3',
            win_fanfare: '/sounds/win_fanfare.mp3'
        });

        const savedKtm = localStorage.getItem('lottery_ktm_entry');
        const savedIphone = localStorage.getItem('lottery_iphone_entry');
        const savedTimeStr = localStorage.getItem('lottery_timestamp');

        // Reset Logic
        const checkReset = () => {
            // If no timestamp, force reset (Legacy Logic Removal as requested)
            if (!savedTimeStr && (savedKtm || savedIphone)) {
                localStorage.removeItem('lottery_ktm_entry');
                localStorage.removeItem('lottery_iphone_entry');
                setKtmEntry(null);
                setIphoneEntry(null);
                return;
            }

            if (savedTimeStr) {
                const savedTime = parseInt(savedTimeStr);
                // Calculate Last Sunday 9:00 PM (21:00)
                const now = getCurrentTime();
                const day = now.getDay(); // 0 is Sunday
                const diffToSunday = day === 0 ? 0 : day;
                // If today is Sunday, we need to check if we passed 9 PM.
                // If passed 9 PM, the 'reset point' is today 9 PM.
                // If before 9 PM, the 'reset point' was LAST Sunday 9 PM.

                // Simpler approach: Get the most recent "Sunday 9 PM" that happened in the past.
                // Create date for 'Today 9 PM'
                let resetPoint = getCurrentTime();
                resetPoint.setHours(21, 0, 0, 0);

                // If today is NOT Sunday, go back to last Sunday
                if (day !== 0) {
                    resetPoint.setDate(resetPoint.getDate() - day);
                } else {
                    // Today IS Sunday.
                    // If now < 9 PM, then the reset point was actually LAST week's Sunday 9 PM.
                    if (now.getTime() < resetPoint.getTime()) {
                        resetPoint.setDate(resetPoint.getDate() - 7);
                    }
                    // If now > 9 PM, then reset point is today 9 PM.
                }

                // Logic: If savedTime is BEFORE the resetPoint, it means it's old -> Clear it.
                if (savedTime < resetPoint.getTime()) {
                    console.log("Weekly Reset: Clearing old entries.");
                    localStorage.removeItem('lottery_ktm_entry');
                    localStorage.removeItem('lottery_iphone_entry');
                    localStorage.removeItem('lottery_timestamp');
                    setKtmEntry(null);
                    setIphoneEntry(null);
                    return;
                }
            }

            // If not cleared, set state
            if (savedKtm) setKtmEntry(parseInt(savedKtm));
            if (savedIphone) setIphoneEntry(parseInt(savedIphone));
        };

        checkReset();
    }, []);

    const handleJoinKTM = async () => {
        const timeCheck = checkLotteryTimeRestriction();
        if (!timeCheck.allowed) {
            alert(timeCheck.message);
            return;
        }

        try {
            // Generate unique code
            const luckyNumber = Math.floor(Math.random() * 900000) + 100000;

            // Save to Firestore
            await addDoc(collection(db, 'sunday_lottery_participants'), {
                code: luckyNumber,
                prize: 'KTM',
                joinedAt: Timestamp.now(),
            });
            console.log('Processed new KTM entry:', luckyNumber);

            setKtmEntry(luckyNumber);
            localStorage.setItem('lottery_ktm_entry', luckyNumber.toString());
            localStorage.setItem('lottery_timestamp', getCurrentTime().getTime().toString());
        } catch (error) {
            console.error("Error joining KTM lottery:", error);
            alert("Failed to join. Please check your internet connection.");
        }
    };

    const handleJoinIPhone = async () => {
        const timeCheck = checkLotteryTimeRestriction();
        if (!timeCheck.allowed) {
            alert(timeCheck.message);
            return;
        }

        try {
            const luckyNumber = Math.floor(Math.random() * 900000) + 100000;

            // Save to Firestore
            await addDoc(collection(db, 'sunday_lottery_participants'), {
                code: luckyNumber,
                prize: 'iPhone',
                joinedAt: Timestamp.now(),
            });
            console.log('Processed new iPhone entry:', luckyNumber);

            setIphoneEntry(luckyNumber);
            localStorage.setItem('lottery_iphone_entry', luckyNumber.toString());
            localStorage.setItem('lottery_timestamp', getCurrentTime().getTime().toString());
        } catch (error) {
            console.error("Error joining iPhone lottery:", error);
            alert("Failed to join. Please check your internet connection.");
        }
    };

    const handleViewDraw = (selectedPrize: 'iPhone' | 'KTM') => {
        soundManager.resumeContext();
        setEventState(selectedPrize === 'iPhone' ? 'IPHONE_DRAW' : 'KTM_DRAW');
    };

    return (
        <div
            className="w-full h-full flex flex-col animate-in fade-in duration-500 relative"
            onPointerDown={handlePressStart}
            onPointerUp={handlePressEnd}
            onPointerLeave={handlePressEnd}
            onContextMenu={(e) => e.preventDefault()}
        >
            <button
                onClick={onBack}
                className="absolute top-4 left-0 z-50 p-2 text-white/50 hover:text-white transition-colors"
            >
                ← Back to Events
            </button>

            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl overflow-hidden min-h-[600px] flex flex-col mt-8">
                {eventState === 'JOINING' && (
                    <JoiningView
                        ktmEntry={ktmEntry}
                        iphoneEntry={iphoneEntry}
                        onJoinKTM={handleJoinKTM}
                        onJoinIPhone={handleJoinIPhone}
                        onViewDraw={handleViewDraw}
                        eventData={eventData}
                    />
                )}
                {eventState === 'IPHONE_DRAW' && <DrawView prize="iPhone" winnerData={eventData?.iphone_winner} startTime={eventData?.iphone_start} onBack={() => setEventState('JOINING')} />}
                {eventState === 'IPHONE_WINNER' && <WinnerView prize="iPhone" winnerData={eventData?.iphone_winner} />}
                {eventState === 'KTM_WAITING' && <WaitingView />}
                {eventState === 'KTM_DRAW' && <DrawView prize="KTM" winnerData={eventData?.ktm_winner} startTime={eventData?.ktm_start} onBack={() => setEventState('JOINING')} />}
                {eventState === 'KTM_WINNER' && <WinnerView prize="KTM" winnerData={eventData?.ktm_winner} />}
                {eventState === 'ENDED' && <EndedView />}
            </div>
        </div>
    );
};

const EventLobby: React.FC<{ onSelect: (id: string) => void, eventData: LotteryEventData | null }> = ({ onSelect, eventData }) => {

    // Countdown Logic for Lobby Card
    const [timeString, setTimeString] = useState("00:00:00");

    useEffect(() => {
        const updateTimer = () => {
            if (!eventData) return;
            // Target next draw
            const now = new Date();
            const iphoneStart = eventData.iphone_start.toDate();
            // Simple logic: count down to iPhone start (7PM)
            // If passed, count to KTM? Or just show "LIVE"?
            // For this UI demo, let's count to iPhone start.

            let target = iphoneStart;
            if (now > iphoneStart) {
                // If iPhone started, maybe show KTM start?
                // matching original logic
                const ktmStart = eventData.ktm_start.toDate();
                if (now < ktmStart) target = ktmStart;
                else {
                    // next week
                    target = new Date(iphoneStart);
                    target.setDate(target.getDate() + 7);
                }
            }

            const diff = target.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeString("00:00:00");
                return;
            }
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / (1000 * 60)) % 60);
            const s = Math.floor((diff / 1000) % 60);
            setTimeString(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        };
        const i = setInterval(updateTimer, 1000);
        updateTimer();
        return () => clearInterval(i);
    }, [eventData]);


    return (
        <div className="h-full flex flex-col relative overflow-hidden pb-4 font-['Inter']">
            {/* Styles for Teko and Custom Gradients */}
            <style>{`
                .font-display { font-family: 'Teko', sans-serif; }
                .text-gradient-gold {
                    background: linear-gradient(to bottom, #FFF7CC, #FFD700, #B8860B);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .shadow-glow-gold {
                     box-shadow: 0 0 20px rgba(255, 215, 0, 0.15);
                }
                .prize-card-glass {
                    background: linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255, 215, 0, 0.1);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.05);
                }
            `}</style>

            <main className="pt-4 px-4 space-y-6 mx-auto w-full">
                {/* Header Title */}
                <div className="text-center relative">
                    <h1 className="font-display font-bold text-3xl text-white tracking-[0.2em] opacity-90 drop-shadow-md">
                        EVENT <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-600">ARENA</span>
                    </h1>
                    <div className="h-px w-20 mx-auto mt-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
                </div>

                {/* Sunday Lottery Hero Card */}
                <div className="relative group w-full rounded-[2rem] p-[1px] bg-gradient-to-b from-yellow-500/30 via-white/5 to-transparent shadow-glow-gold transition-transform duration-500">
                    <div className="absolute inset-0 bg-yellow-500/5 blur-xl rounded-[2rem]"></div>
                    <div className="relative w-full bg-[#08080c] rounded-[calc(2rem-1px)] overflow-hidden">

                        {/* Background Image */}
                        <div className="absolute inset-0">
                            <img alt="Lottery Background" className="w-full h-full object-cover opacity-30 mix-blend-luminosity scale-110 group-hover:scale-105 transition-transform duration-1000 ease-out" src="/images/poster_sunday_lottery.png" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-[#08080c]/80 to-[#08080c]/40"></div>
                        </div>

                        <div className="relative z-10 p-5 flex flex-col h-full">
                            {/* Card Header: Live Tag & Title */}
                            <div className="flex justify-between items-end mb-6 border-b border-white/5 pb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${eventData?.status?.startsWith('LIVE') ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-500'}`}></span>
                                        <span className={`text-[10px] uppercase tracking-widest font-bold ${eventData?.status?.startsWith('LIVE') ? 'text-green-400' : 'text-gray-400'}`}>
                                            {eventData?.status?.startsWith('LIVE') ? 'Live Now' : 'Up Next'}
                                        </span>
                                    </div>
                                    <h2 className="font-display font-bold text-2xl text-gradient-gold leading-none tracking-wide">SUNDAY LOTTERY</h2>
                                </div>
                                <div className="text-right">
                                    <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold block mb-0.5">Ends In</span>
                                    <div className="font-display font-medium text-lg text-white tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                        {timeString.split(':').map((part, i) => (
                                            <span key={i}>
                                                {part}
                                                {i < 2 && <span className="text-yellow-500 mx-px">:</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Prizes Grid */}
                            <div className="mb-2">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold">Grand Prizes</span>
                                    <span className="text-[10px] text-yellow-500/80 italic">Limited entries available</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="prize-card-glass rounded-xl p-2 flex flex-col items-center justify-center relative group/card cursor-pointer">
                                        <div className="absolute top-1.5 right-1.5 opacity-50">
                                            <span className="text-[8px] text-white material-symbols-outlined">i</span>
                                        </div>
                                        <div className="mb-1.5 transform hover:scale-110 transition-transform duration-300">
                                            <IPhoneToken size={32} showLabel={false} />
                                        </div>
                                        <span className="font-display font-bold text-base text-white leading-none">iPhone Token</span>
                                        <div className="flex flex-col items-center mt-0.5">
                                            <span className="text-[10px] text-white font-bold tracking-wider">₹1,49,000</span>
                                            <span className="text-[6px] text-gray-500 uppercase tracking-widest">Value in INR</span>
                                        </div>
                                        <div className="absolute inset-0 border border-yellow-500/0 rounded-xl group-hover/card:border-yellow-500/30 transition-colors duration-300"></div>
                                    </div>
                                    <div className="prize-card-glass rounded-xl p-2 flex flex-col items-center justify-center relative group/card cursor-pointer">
                                        <div className="absolute top-1.5 right-1.5 opacity-50">
                                            <span className="text-[8px] text-white">i</span>
                                        </div>
                                        <div className="mb-1.5 transform hover:scale-110 transition-transform duration-300">
                                            <KTMToken size={32} showLabel={false} />
                                        </div>
                                        <span className="font-display font-bold text-base text-white leading-none">KTM Token</span>
                                        <div className="flex flex-col items-center mt-0.5">
                                            <span className="text-[10px] text-white font-bold tracking-wider">₹3,40,000</span>
                                            <span className="text-[6px] text-gray-500 uppercase tracking-widest">Value in INR</span>
                                        </div>
                                        <div className="absolute inset-0 border border-orange-500/0 rounded-xl group-hover/card:border-orange-500/30 transition-colors duration-300"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Enter Button */}
                            <div className="mt-6">
                                <button
                                    onClick={() => onSelect('sunday_lottery')}
                                    className="w-full relative overflow-hidden group/btn rounded-xl"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 transition-all duration-300 group-hover/btn:brightness-110"></div>
                                    <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }}></div>
                                    <div className="relative px-4 py-2.5 flex items-center justify-center gap-2">
                                        <span className="font-display font-bold text-lg text-black tracking-wide">ENTER ARENA</span>
                                        <span className="font-bold text-black group-hover/btn:translate-x-1 transition-transform text-sm">→</span>
                                    </div>
                                    <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover/btn:animate-shine" style={{ transition: '0.5s' }}></div>
                                </button>
                                <div className="text-center mt-2">
                                    <span className="text-[10px] text-gray-500 font-medium">Entry Fee: <span className="text-green-400">FREE</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Speed Rush Card (Coming Soon) */}
                <div className="relative w-full rounded-2xl border border-white/5 bg-black/40 overflow-hidden grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <div className="absolute inset-0">
                        <img alt="Racing Background" className="w-full h-full object-cover opacity-20" src="/images/poster_ktm_rush.png" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    </div>
                    <div className="relative z-10 p-4 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                                <span className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">Coming Soon</span>
                            </div>
                            <h3 className="font-display font-bold text-xl text-white tracking-wide">SPEED RUSH</h3>
                            <p className="text-[8px] text-gray-400 font-light mt-0.5">High stakes racing event</p>
                        </div>
                        <div className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-sm">
                            <span className="text-gray-400 text-sm">🔒</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

const Event: React.FC<EventProps> = (props) => {
    const [view, setView] = useState<'LOBBY' | 'SUNDAY_LOTTERY'>('LOBBY');
    const [eventData, setEventData] = useState<LotteryEventData | null>(null);

    // Fetch Event Data Logic moved to Parent to share with Lobby
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'events', 'sunday_lottery'), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as LotteryEventData;
                setEventData(data);
            }
        });
        return () => unsub();
    }, []);


    return (
        <div className="w-full max-w-md mx-auto h-[85vh] flex flex-col">
            {view === 'LOBBY' ? (
                <EventLobby
                    onSelect={(id) => {
                        if (id === 'sunday_lottery') setView('SUNDAY_LOTTERY');
                    }}
                    eventData={eventData}
                />
            ) : (
                <SundayLotteryView {...props} eventData={eventData} onBack={() => setView('LOBBY')} />
            )}
        </div>
    );
};
export default Event;
