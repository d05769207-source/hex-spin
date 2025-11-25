
import React, { useState, useEffect } from 'react';
import PrizeImage from '../PrizeImage';

type EventState = 'JOINING' | 'IPHONE_DRAW' | 'IPHONE_WINNER' | 'KTM_WAITING' | 'KTM_DRAW' | 'KTM_WINNER' | 'ENDED';

const Event: React.FC = () => {
    const [eventState, setEventState] = useState<EventState>('JOINING');
    const [ktmEntry, setKtmEntry] = useState<number | null>(null);
    const [iphoneEntry, setIphoneEntry] = useState<number | null>(null);

    useEffect(() => {
        // Load entries from localStorage
        const savedKtm = localStorage.getItem('lottery_ktm_entry');
        const savedIphone = localStorage.getItem('lottery_iphone_entry');
        if (savedKtm) setKtmEntry(parseInt(savedKtm));
        if (savedIphone) setIphoneEntry(parseInt(savedIphone));
    }, []);

    useEffect(() => {
        const checkEventState = () => {
            const now = new Date();
            const day = now.getDay(); // 0 = Sunday
            const hours = now.getHours();
            const minutes = now.getMinutes();

            // Not Sunday or before 7 PM
            if (day !== 0 || hours < 19) {
                setEventState('JOINING');
                return;
            }

            // Sunday 7:00-7:10 PM - iPhone Draw
            if (hours === 19 && minutes < 10) {
                setEventState('IPHONE_DRAW');
                return;
            }

            // Sunday 7:10-7:30 PM - iPhone Winner
            if (hours === 19 && minutes >= 10 && minutes < 30) {
                setEventState('IPHONE_WINNER');
                return;
            }

            // Sunday 7:30-8:00 PM - Waiting for KTM
            if ((hours === 19 && minutes >= 30) || (hours === 20 && minutes === 0)) {
                setEventState('KTM_WAITING');
                return;
            }

            // Sunday 8:00-8:10 PM - KTM Draw
            if (hours === 20 && minutes < 10) {
                setEventState('KTM_DRAW');
                return;
            }

            // Sunday 8:10-8:30 PM - KTM Winner
            if (hours === 20 && minutes >= 10 && minutes < 30) {
                setEventState('KTM_WINNER');
                return;
            }

            // After 8:30 PM
            setEventState('ENDED');
        };

        checkEventState();
        const interval = setInterval(checkEventState, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const handleJoinKTM = async () => {
        // Generate random number
        const luckyNumber = Math.floor(Math.random() * 100000) + 1;
        setKtmEntry(luckyNumber);
        localStorage.setItem('lottery_ktm_entry', luckyNumber.toString());

        // TODO: Save to Firestore
        // TODO: Show ad
    };

    const handleJoinIPhone = async () => {
        // Generate random number
        const luckyNumber = Math.floor(Math.random() * 100000) + 1;
        setIphoneEntry(luckyNumber);
        localStorage.setItem('lottery_iphone_entry', luckyNumber.toString());

        // TODO: Save to Firestore
        // TODO: Show ad
    };

    return (
        <div className="w-full max-w-md mx-auto h-full flex flex-col p-4 animate-in slide-in-from-right duration-300 pb-24 md:pb-0">
            {eventState === 'JOINING' && (
                <JoiningView
                    ktmEntry={ktmEntry}
                    iphoneEntry={iphoneEntry}
                    onJoinKTM={handleJoinKTM}
                    onJoinIPhone={handleJoinIPhone}
                />
            )}
            {eventState === 'IPHONE_DRAW' && <DrawView prize="iPhone" />}
            {eventState === 'IPHONE_WINNER' && <WinnerView prize="iPhone" />}
            {eventState === 'KTM_WAITING' && <WaitingView />}
            {eventState === 'KTM_DRAW' && <DrawView prize="KTM" />}
            {eventState === 'KTM_WINNER' && <WinnerView prize="KTM" />}
            {eventState === 'ENDED' && <EndedView />}
        </div>
    );
};

// Joining View Component
interface JoiningViewProps {
    ktmEntry: number | null;
    iphoneEntry: number | null;
    onJoinKTM: () => void;
    onJoinIPhone: () => void;
}

const JoiningView: React.FC<JoiningViewProps> = ({ ktmEntry, iphoneEntry, onJoinKTM, onJoinIPhone }) => {
    const [timeUntilDraw, setTimeUntilDraw] = useState('');

    useEffect(() => {
        const updateCountdown = () => {
            const now = new Date();
            const nextSunday = new Date();

            // If today is Sunday and before 7 PM
            if (now.getDay() === 0 && now.getHours() < 19) {
                const drawTime = new Date(now);
                drawTime.setHours(19, 0, 0, 0);
                const diff = drawTime.getTime() - now.getTime();

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff / (1000 * 60)) % 60);
                setTimeUntilDraw(`${hours}h ${minutes}m`);
            } else {
                // Calculate next Sunday 7 PM
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
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
                    🎰 SUNDAY LOTTERY
                </h1>
                <p className="text-gray-400 text-sm">Win KTM Bike or iPhone!</p>
                <div className="mt-4 bg-black/50 rounded-lg p-3 inline-block border border-yellow-500/30">
                    <p className="text-xs text-gray-400 mb-1">Draw starts in</p>
                    <p className="text-2xl font-black text-yellow-400">{timeUntilDraw}</p>
                </div>
            </div>

            {/* iPhone Lottery */}
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-500/50 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-2xl font-black text-blue-400">iPHONE</h3>
                        <p className="text-xs text-gray-400">Draw at 7:00 PM</p>
                    </div>
                    <PrizeImage prize="iPhone" size="lg" />
                </div>

                {iphoneEntry ? (
                    <div className="bg-black/50 rounded-lg p-4 text-center border border-blue-500/30">
                        <p className="text-xs text-gray-400 mb-2">Your Lucky Number</p>
                        <p className="text-3xl font-black text-blue-400">
                            {iphoneEntry.toString().padStart(6, '0')}
                        </p>
                        <p className="text-xs text-green-400 mt-2 flex items-center justify-center gap-1">
                            <span>✓</span> Entered
                        </p>
                    </div>
                ) : (
                    <button
                        onClick={onJoinIPhone}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-black py-3 rounded-lg hover:scale-105 transition-transform shadow-lg"
                    >
                        WATCH AD & JOIN
                    </button>
                )}
            </div>

            {/* KTM Lottery */}
            <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-2xl font-black text-yellow-400">KTM BIKE</h3>
                        <p className="text-xs text-gray-400">Draw at 8:00 PM</p>
                    </div>
                    <PrizeImage prize="KTM" size="lg" />
                </div>

                {ktmEntry ? (
                    <div className="bg-black/50 rounded-lg p-4 text-center border border-yellow-500/30">
                        <p className="text-xs text-gray-400 mb-2">Your Lucky Number</p>
                        <p className="text-3xl font-black text-yellow-400">
                            {ktmEntry.toString().padStart(6, '0')}
                        </p>
                        <p className="text-xs text-green-400 mt-2 flex items-center justify-center gap-1">
                            <span>✓</span> Entered
                        </p>
                    </div>
                ) : (
                    <button
                        onClick={onJoinKTM}
                        className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-black py-3 rounded-lg hover:scale-105 transition-transform shadow-lg"
                    >
                        WATCH AD & JOIN
                    </button>
                )}
            </div>

            {/* Info */}
            <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                <p className="text-xs text-gray-400 text-center">
                    Results will be announced on Sunday between 7:00 PM - 8:30 PM
                </p>
            </div>
        </div>
    );
};

// Draw View Component
interface DrawViewProps {
    prize: 'iPhone' | 'KTM';
}

const DrawView: React.FC<DrawViewProps> = ({ prize }) => {
    const [currentNumber, setCurrentNumber] = useState(0);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

    useEffect(() => {
        // Auto-start scrolling
        const scrollInterval = setInterval(() => {
            setCurrentNumber(Math.floor(Math.random() * 100000) + 1);
        }, 100);

        // Countdown timer
        const timerInterval = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => {
            clearInterval(scrollInterval);
            clearInterval(timerInterval);
        };
    }, []);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="flex flex-col items-center justify-center h-full">
            <div className="flex items-center gap-3 mb-2">
                <PrizeImage prize={prize} size="md" />
                <h2 className="text-3xl md:text-4xl font-black">
                    {prize === 'iPhone' ? 'iPHONE DRAW' : 'KTM DRAW'}
                </h2>
            </div>
            <p className="text-gray-400 mb-8 text-sm">Draw in progress...</p>

            {/* Scrolling Number Display */}
            <div className="relative w-full max-w-md h-64 bg-black/50 rounded-xl border-2 border-yellow-500 overflow-hidden mb-6 shadow-2xl">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-5xl md:text-6xl font-black text-yellow-400 animate-pulse">
                        {currentNumber.toString().padStart(6, '0')}
                    </div>
                </div>

                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/20 via-transparent to-yellow-500/20 animate-pulse" />
            </div>

            {/* Timer */}
            <div className="bg-black/50 rounded-lg px-6 py-3 border border-yellow-500/30">
                <p className="text-xs text-gray-400 mb-1 text-center">Time Remaining</p>
                <p className="text-3xl font-black text-yellow-400">
                    {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                </p>
            </div>

            <p className="text-gray-400 text-xs mt-6 text-center">
                Winner will be announced automatically
            </p>
        </div>
    );
};

// Winner View Component
const WinnerView: React.FC<DrawViewProps> = ({ prize }) => {
    const [winner] = useState({ number: 45821, name: 'RajKumar' }); // TODO: Fetch from Firestore
    const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const minutes = Math.floor(timeLeft / 60);

    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-4xl md:text-5xl font-black text-green-400 mb-4 animate-bounce">
                🎉 WINNER! 🎉
            </h2>

            <div className="mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <PrizeImage prize={prize} size="sm" />
                    <p className="text-gray-400 text-sm">
                        {prize === 'iPhone' ? 'iPHONE' : 'KTM BIKE'}
                    </p>
                </div>
                <div className="bg-black/50 rounded-xl p-6 border-2 border-green-500/50 mb-4">
                    <p className="text-5xl md:text-6xl font-black text-yellow-400 mb-4">
                        {winner.number.toString().padStart(6, '0')}
                    </p>
                    <p className="text-2xl font-bold text-white">
                        {winner.name}
                    </p>
                </div>
            </div>

            {prize === 'iPhone' && (
                <div className="bg-black/50 rounded-lg p-4 border border-yellow-500/30 mb-4">
                    <p className="text-sm text-gray-400">Next Draw</p>
                    <p className="text-xl font-black text-yellow-400">KTM at 8:00 PM</p>
                </div>
            )}

            <p className="text-gray-400 text-xs">
                Results visible for {minutes} more minutes
            </p>
        </div>
    );
};

// Waiting View Component
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
        <div className="flex flex-col items-center justify-center h-full text-center">
            <PrizeImage prize="KTM" size="xl" />
            <h2 className="text-3xl font-black text-yellow-400 mb-4 mt-6">KTM DRAW</h2>
            <p className="text-gray-400 mb-8">Starting soon...</p>

            <div className="bg-black/50 rounded-xl p-6 border border-yellow-500/30">
                <p className="text-sm text-gray-400 mb-2">Starts in</p>
                <p className="text-4xl font-black text-yellow-400">{timeUntilKTM}</p>
            </div>
        </div>
    );
};

// Ended View Component
const EndedView: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="text-6xl mb-6">🎰</span>
            <h2 className="text-3xl font-black text-yellow-400 mb-4">EVENT ENDED</h2>
            <p className="text-gray-400 mb-8">Thank you for participating!</p>

            <div className="bg-black/50 rounded-lg p-6 border border-yellow-500/30">
                <p className="text-sm text-gray-400 mb-2">Next Event</p>
                <p className="text-xl font-black text-yellow-400">Next Sunday</p>
            </div>

            <p className="text-gray-400 text-xs mt-6">
                Join anytime starting Monday 12:00 AM
            </p>
        </div>
    );
};

export default Event;
