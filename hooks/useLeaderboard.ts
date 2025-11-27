import { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types';
import { subscribeToLeaderboard, getUserRank } from '../services/leaderboardService';
import { formatWeekRange } from '../utils/weekUtils';

interface UseLeaderboardReturn {
    leaderboard: LeaderboardEntry[];
    loading: boolean;
    error: string | null;
    userRank: number;
    weekRange: string;
    refresh: () => void;
}

export const useLeaderboard = (userId?: string, limitCount: number = 100): UseLeaderboardReturn => {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRank, setUserRank] = useState(0);
    const [weekRange] = useState(formatWeekRange());

    useEffect(() => {
        setLoading(true);
        setError(null);

        // Subscribe to real-time leaderboard updates
        const unsubscribe = subscribeToLeaderboard((data) => {
            setLeaderboard(data);
            setLoading(false);

            // If userId is provided, find user's rank
            if (userId) {
                const userEntry = data.find(entry => entry.userId === userId);
                if (userEntry && userEntry.rank) {
                    setUserRank(userEntry.rank);
                } else {
                    // User not in top list, fetch their rank separately
                    getUserRank(userId).then(rank => {
                        setUserRank(rank);
                    });
                }
            }
        }, limitCount);

        // Cleanup subscription on unmount
        return () => {
            unsubscribe();
        };
    }, [userId, limitCount]);

    const refresh = () => {
        setLoading(true);
        // The subscription will automatically refresh
    };

    return {
        leaderboard,
        loading,
        error,
        userRank,
        weekRange,
        refresh
    };
};
