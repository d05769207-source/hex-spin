import React, { useState, useEffect } from 'react';
import { getWeekEndDate, getCurrentTime, getSimulatedTimeOffset } from '../utils/weekUtils';

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

const WeeklyTimer: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const updateTimer = () => {
            const now = getCurrentTime();
            const resetDate = getWeekEndDate(now); // Pass 'now' to ensure we get the reset date relative to simulated time

            // Calculate time difference
            const diff = resetDate.getTime() - now.getTime();

            if (diff <= 0) {
                // If we passed the time, it means we are in the split second before the new week starts logic kicks in elsewhere
                // or just at 0.
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            setTimeLeft({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((diff / (1000 * 60)) % 60),
                seconds: Math.floor((diff / 1000) % 60)
            });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-lg ${getSimulatedTimeOffset() !== 0 ? 'bg-red-900/80 border-red-500' : 'bg-black/50 border-yellow-500/30'}`}>
            {getSimulatedTimeOffset() !== 0 && (
                <span className="text-[9px] font-black bg-red-600 text-white px-1 rounded animate-pulse">TEST</span>
            )}
            <div className="flex flex-col md:flex-row md:gap-1 text-[9px] md:text-[10px] text-gray-400 uppercase tracking-wider font-bold leading-none md:leading-normal mr-1">
                <span>Weekly</span>
                <span>Reset:</span>
            </div>
            <div className="flex gap-1 items-center">
                <TimeUnit value={timeLeft.days} label="D" />
                <span className="text-yellow-400 text-xs">:</span>
                <TimeUnit value={timeLeft.hours} label="H" />
                <span className="text-yellow-400 text-xs">:</span>
                <TimeUnit value={timeLeft.minutes} label="M" />
                <span className="text-yellow-400 text-xs">:</span>
                <TimeUnit value={timeLeft.seconds} label="S" />
            </div>
        </div>
    );
};

interface TimeUnitProps {
    value: number;
    label: string;
}

const TimeUnit: React.FC<TimeUnitProps> = ({ value, label }) => (
    <div className="flex flex-col items-center">
        <span className="text-yellow-400 font-black text-xs md:text-sm leading-none tabular-nums">
            {String(value).padStart(2, '0')}
        </span>
        <span className="text-[7px] md:text-[8px] text-gray-500 font-bold leading-none mt-0.5">
            {label}
        </span>
    </div>
);

export default WeeklyTimer;
