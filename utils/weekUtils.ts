// Week management utilities for leaderboard


// --- TIME SIMULATION LOGIC ---
let simulatedTimeOffset = 0;

// Eager load for reliability
try {
    const stored = localStorage.getItem('SIM_TIME_OFFSET');
    if (stored) {
        simulatedTimeOffset = parseInt(stored, 10);
        console.log(`🕒 LOADED TIME OFFSET: ${simulatedTimeOffset}ms`);
    }
} catch (e) {
    console.error("Failed to load time offset", e);
}

export const setSimulatedTimeOffset = (offsetMs: number) => {
    simulatedTimeOffset = offsetMs;
    localStorage.setItem('SIM_TIME_OFFSET', offsetMs.toString());
    console.log(`🕒 Time Simulation Active! Offset: ${offsetMs}ms`);
};

export const getSimulatedTimeOffset = (): number => {
    return simulatedTimeOffset;
};

export const clearSimulatedTime = () => {
    simulatedTimeOffset = 0;
    localStorage.removeItem('SIM_TIME_OFFSET');
    console.log("🕒 Time Simulation Cleared.");
};

// Helper: Get 'Now' with simulation
export const getCurrentTime = (): Date => {
    return new Date(Date.now() + getSimulatedTimeOffset());
};

// Internal alias for consistency in this file
const getNow = getCurrentTime;


export const getCurrentWeekId = (): string => {
    const now = getNow();
    const year = now.getFullYear();
    const weekNumber = getWeekNumber(now);
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
};

export const getCurrentDayId = (): string => {
    const now = getNow();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const getWeekStartDate = (date: Date = getNow()): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
};

export const getWeekEndDate = (date: Date = getNow()): Date => {
    const start = getWeekStartDate(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
};

export const isNewWeek = (lastWeekStartDate: Date): boolean => {
    const currentWeekStart = getWeekStartDate();
    return currentWeekStart.getTime() > lastWeekStartDate.getTime();
};

export const formatWeekRange = (date: Date = getNow()): string => {
    const start = getWeekStartDate(date);
    const end = getWeekEndDate(date);

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', options);
    const endStr = end.toLocaleDateString('en-US', options);

    return `${startStr} - ${endStr}`;
};

export const getTimeRemaining = (): number => {
    const now = getCurrentTime();
    const resetDate = getWeekEndDate(now);
    return resetDate.getTime() - now.getTime();
};
