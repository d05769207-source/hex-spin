
import React, { useState, useEffect } from 'react';

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

const WeeklyTimer: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        // Get or set weekly reset date
        const getResetDate = (): Date => {
            const stored = localStorage.getItem('weekly_reset_date');
            if (stored) {
                const resetDate = new Date(stored);
                if (resetDate > new Date()) return resetDate;
            }

            // Create new reset date (7 days from now)
            const newReset = new Date();
            newReset.setDate(newReset.getDate() + 7);
            newReset.setHours(0, 0, 0, 0); // Reset at midnight
            localStorage.setItem('weekly_reset_date', newReset.toISOString());
            return newReset;
        };

        const updateTimer = () => {
            const resetDate = getResetDate();
            const now = new Date();
            const diff = resetDate.getTime() - now.getTime();

            if (diff <= 0) {
                // Reset timer - create new 7-day period
                localStorage.removeItem('weekly_reset_date');
                const newReset = getResetDate();
                const newDiff = newReset.getTime() - now.getTime();

                setTimeLeft({
                    days: Math.floor(newDiff / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((newDiff / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((newDiff / (1000 * 60)) % 60),
                    seconds: Math.floor((newDiff / 1000) % 60)
                });
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
        <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-lg border border-yellow-500/30 shadow-lg">
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
        <span className="text-yellow-400 font-black text-xs md:text-sm leading-none">
            {String(value).padStart(2, '0')}
        </span>
        <span className="text-[7px] md:text-[8px] text-gray-500 font-bold leading-none mt-0.5">
            {label}
        </span>
    </div>
);

export default WeeklyTimer;
