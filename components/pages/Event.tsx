import React, { useState, useEffect } from 'react';
import PrizeImage from '../PrizeImage';
import { soundManager } from '../../utils/SoundManager';

type EventState = 'JOINING' | 'IPHONE_DRAW' | 'IPHONE_WINNER' | 'KTM_WAITING' | 'KTM_DRAW' | 'KTM_WINNER' | 'ENDED';

interface EventProps {
    isAdminMode?: boolean;
}

interface JoiningViewProps {
    ktmEntry: number | null;
    iphoneEntry: number | null;
    onJoinKTM: () => void;
    onJoinIPhone: () => void;
    onViewDraw: (prize: 'iPhone' | 'KTM') => void;
}

const JoiningView: React.FC<JoiningViewProps> = ({ ktmEntry, iphoneEntry, onJoinKTM, onJoinIPhone, onViewDraw }) => {
    const [timeUntilDraw, setTimeUntilDraw] = useState('');

    useEffect(() => {
        const updateCountdown = () => {
            const now = new Date();
            const nextSunday = new Date();

            if (now.getDay() === 0 && now.getHours() < 19) {
                const drawTime = new Date(now);
                drawTime.setHours(19, 0, 0, 0);
                const diff = drawTime.getTime() - now.getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff / (1000 * 60)) % 60);
                setTimeUntilDraw(`${hours}h ${minutes}m`);
            } else {
                nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7));
                nextSunday.setHours(19, 0, 0, 0);
                const diff = nextSunday.getTime() - now.getTime();
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                setTimeUntilDraw(`${days}d ${hours}h`);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 60000);
        return () => clearInterval(interval);
    }, []);

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
                                        className="w-full bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-bold py-1.5 rounded border border-indigo-500/30 transition-all"
                                    >
                                        View Draw
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
                                        className="w-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-[10px] font-bold py-1.5 rounded border border-orange-500/30 transition-all"
                                    >
                                        View Draw
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
    onBack: () => void;
}

const DrawView: React.FC<DrawViewProps> = ({ prize, onBack }) => {
    // 6 reels for 6 digits (000000 - 999999)
    const [reels, setReels] = useState<number[]>([0, 0, 0, 0, 0, 0]);
    const [isSpinning, setIsSpinning] = useState<boolean[]>([true, true, true, true, true, true]);
    const [muted, setMuted] = useState(false);
    const [finalNumber] = useState<number[]>(() => {
        // Generate a random 6-digit number, split into array
        const num = Math.floor(Math.random() * 1000000);
        return num.toString().padStart(6, '0').split('').map(Number);
    });

    // Audio Initialization
    useEffect(() => {
        return () => {
            soundManager.stop('spin_loop');
            soundManager.stop('win_fanfare');
            soundManager.stop('reel_stop'); // Ensure no stray stops play
        };
    }, []);

    useEffect(() => {
        soundManager.mute(muted);
    }, [muted]);

    useEffect(() => {
        // Start spinning sound
        if (!muted) {
            soundManager.play('spin_loop', { loop: true, volume: 0.5 });
        }

        // Start stopping reels sequentially after a delay
        const stopDelays = [2000, 3000, 4000, 5000, 6000, 7000]; // Delays for each reel to stop
        const timeoutIds: NodeJS.Timeout[] = [];

        stopDelays.forEach((delay, index) => {
            const id = setTimeout(() => {
                setIsSpinning(prev => {
                    const newState = [...prev];
                    newState[index] = false;
                    return newState;
                });

                // Set the final number for this reel
                setReels(prev => {
                    const newReels = [...prev];
                    newReels[index] = finalNumber[index];
                    return newReels;
                });

                // Play stop sound
                soundManager.play('reel_stop', { volume: 0.8 });

                // If it's the last reel, stop spin sound and play win sound
                if (index === 5) {
                    soundManager.stop('spin_loop');
                    const winId = setTimeout(() => soundManager.play('win_fanfare', { volume: 1.0 }), 500);
                    timeoutIds.push(winId);
                }
            }, delay);
            timeoutIds.push(id);
        });

        return () => {
            timeoutIds.forEach(clearTimeout);
        };
    }, []);

    // Animation effect for spinning reels
    useEffect(() => {
        const intervals: NodeJS.Timeout[] = [];

        reels.forEach((_, index) => {
            if (isSpinning[index]) {
                const interval = setInterval(() => {
                    setReels(prev => {
                        const newReels = [...prev];
                        newReels[index] = Math.floor(Math.random() * 10);
                        return newReels;
                    });
                }, 50 + (index * 10)); // Slightly different speeds for effect
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

const WinnerView: React.FC<DrawViewProps> = ({ prize }) => {
    const [winner] = useState({ number: 45821, name: 'RajKumar' });
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
                        {winner.number.toString().padStart(6, '0')}
                    </p>
                    <div className="h-px w-16 bg-green-500/30 mx-auto mb-3" />
                    <p className="text-lg font-bold text-green-400">
                        {winner.name}
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
            const now = new Date();
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

const Event: React.FC<EventProps> = ({ isAdminMode = false }) => {
    const [eventState, setEventState] = useState<EventState>('JOINING');
    const [ktmEntry, setKtmEntry] = useState<number | null>(null);
    const [iphoneEntry, setIphoneEntry] = useState<number | null>(null);

    useEffect(() => {
        // Preload sounds
        soundManager.load({
            spin_loop: '/sounds/spin_loop.mp3',
            reel_stop: '/sounds/reel_stop.mp3',
            win_fanfare: '/sounds/win_fanfare.mp3'
        });

        const savedKtm = localStorage.getItem('lottery_ktm_entry');
        const savedIphone = localStorage.getItem('lottery_iphone_entry');
        if (savedKtm) setKtmEntry(parseInt(savedKtm));
        if (savedIphone) setIphoneEntry(parseInt(savedIphone));
    }, []);

    // Time check disabled for manual testing
    /*
    useEffect(() => {
        const checkEventState = () => {
            const now = new Date();
                            const day = now.getDay();
                            const hours = now.getHours();
                            const minutes = now.getMinutes();

                            if (isAdminMode) {
                                setEventState('JOINING');
                            return;
            }

                            if (day !== 0 || hours < 19) {
                                setEventState('JOINING');
                            return;
            }

                            if (hours === 19 && minutes < 10) {
                                setEventState('IPHONE_DRAW');
                            return;
            }

            if (hours === 19 && minutes >= 10 && minutes < 30) {
                                setEventState('IPHONE_WINNER');
                            return;
            }

            if ((hours === 19 && minutes >= 30) || (hours === 20 && minutes === 0)) {
                                setEventState('KTM_WAITING');
                            return;
            }

                            if (hours === 20 && minutes < 10) {
                                setEventState('KTM_DRAW');
                            return;
            }

            if (hours === 20 && minutes >= 10 && minutes < 30) {
                                setEventState('KTM_WINNER');
                            return;
            }

                            setEventState('ENDED');
        };

                            checkEventState();
                            const interval = setInterval(checkEventState, 30000);
        return () => clearInterval(interval);
    }, [isAdminMode]);
                            */

    const handleJoinKTM = async () => {
        const luckyNumber = Math.floor(Math.random() * 100000) + 1;
        setKtmEntry(luckyNumber);
        localStorage.setItem('lottery_ktm_entry', luckyNumber.toString());
    };

    const handleJoinIPhone = async () => {
        const luckyNumber = Math.floor(Math.random() * 100000) + 1;
        setIphoneEntry(luckyNumber);
        localStorage.setItem('lottery_iphone_entry', luckyNumber.toString());
    };

    const handleViewDraw = (selectedPrize: 'iPhone' | 'KTM') => {
        // Resume context on user interaction
        soundManager.resumeContext();
        setEventState(selectedPrize === 'iPhone' ? 'IPHONE_DRAW' : 'KTM_DRAW');
    };

    return (
        <div className="w-full max-w-sm mx-auto h-full flex flex-col p-2 animate-in fade-in duration-500">
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
                {eventState === 'JOINING' && (
                    <JoiningView
                        ktmEntry={ktmEntry}
                        iphoneEntry={iphoneEntry}
                        onJoinKTM={handleJoinKTM}
                        onJoinIPhone={handleJoinIPhone}
                        onViewDraw={handleViewDraw}
                    />
                )}
                {eventState === 'IPHONE_DRAW' && <DrawView prize="iPhone" onBack={() => setEventState('JOINING')} />}
                {eventState === 'IPHONE_WINNER' && <WinnerView prize="iPhone" />}
                {eventState === 'KTM_WAITING' && <WaitingView />}
                {eventState === 'KTM_DRAW' && <DrawView prize="KTM" onBack={() => setEventState('JOINING')} />}
                {eventState === 'KTM_WINNER' && <WinnerView prize="KTM" />}
                {eventState === 'ENDED' && <EndedView />}
            </div>
        </div>
    );
};

export default Event;
