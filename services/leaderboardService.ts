import {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    doc,
    setDoc,
    getDoc,
    onSnapshot,
    where,
    Timestamp,
    updateDoc,
    increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { LeaderboardEntry, WeeklyStats } from '../types';
import { getCurrentWeekId, getWeekStartDate, getWeekEndDate } from '../utils/weekUtils';

// Get weekly leaderboard data
export const getWeeklyLeaderboard = async (limitCount: number = 100): Promise<LeaderboardEntry[]> => {
    try {
        const weekId = getCurrentWeekId();
        const leaderboardRef = collection(db, 'weeklyLeaderboard');
        const q = query(
            leaderboardRef,
            where('weekId', '==', weekId),
            orderBy('coins', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        const leaderboard: LeaderboardEntry[] = [];

        let index = 0;
        snapshot.forEach((doc) => {
            const data = doc.data();
            leaderboard.push({
                userId: data.userId,
                username: data.username,
                coins: data.coins || 0,
                photoURL: data.photoURL,
                rank: index + 1
            });
            index++;
        });

        return leaderboard;
    } catch (error) {
        console.error('Error fetching weekly leaderboard:', error);
        return [];
    }
};

// Subscribe to real-time leaderboard updates
export const subscribeToLeaderboard = (
    callback: (leaderboard: LeaderboardEntry[]) => void,
    limitCount: number = 100
) => {
    const weekId = getCurrentWeekId();
    const leaderboardRef = collection(db, 'weeklyLeaderboard');
    const q = query(
        leaderboardRef,
        where('weekId', '==', weekId),
        orderBy('coins', 'desc'),
        limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
        const leaderboard: LeaderboardEntry[] = [];
        let index = 0;
        snapshot.forEach((doc) => {
            const data = doc.data();
            leaderboard.push({
                userId: data.userId,
                username: data.username,
                coins: data.coins || 0,
                photoURL: data.photoURL,
                rank: index + 1
            });
            index++;
        });
        callback(leaderboard);
    }, (error) => {
        console.error('Error in leaderboard subscription:', error);
        callback([]);
    });
};

// Get user's rank in weekly leaderboard
export const getUserRank = async (userId: string): Promise<number> => {
    try {
        const weekId = getCurrentWeekId();
        const leaderboardRef = collection(db, 'weeklyLeaderboard');
        const q = query(
            leaderboardRef,
            where('weekId', '==', weekId),
            orderBy('coins', 'desc')
        );

        const snapshot = await getDocs(q);
        let rank = 0;
        let index = 0;

        snapshot.forEach((doc) => {
            if (doc.data().userId === userId) {
                rank = index + 1;
            }
            index++;
        });

        return rank;
    } catch (error) {
        console.error('Error getting user rank:', error);
        return 0;
    }
};

// Update user's weekly coins
export const updateUserWeeklyCoins = async (
    userId: string,
    username: string,
    coinsToAdd: number,
    photoURL?: string
): Promise<void> => {
    try {
        const weekId = getCurrentWeekId();
        const leaderboardDocRef = doc(db, 'weeklyLeaderboard', `${userId}_${weekId}`);

        // Check if document exists
        const docSnap = await getDoc(leaderboardDocRef);

        if (docSnap.exists()) {
            // Update existing entry
            await updateDoc(leaderboardDocRef, {
                coins: increment(coinsToAdd),
                lastUpdated: Timestamp.now()
            });
        } else {
            // Create new entry
            await setDoc(leaderboardDocRef, {
                userId,
                username,
                coins: coinsToAdd,
                photoURL: photoURL || null,
                weekId,
                lastUpdated: Timestamp.now()
            });
        }
    } catch (error) {
        console.error('Error updating weekly coins:', error);
        throw error;
    }
};

// Sync user's total coins to weekly leaderboard (Absolute Value Sync)
export const syncUserToLeaderboard = async (
    userId: string,
    username: string,
    totalCoins: number,
    photoURL?: string
): Promise<void> => {
    try {
        const weekId = getCurrentWeekId();
        const leaderboardDocRef = doc(db, 'weeklyLeaderboard', `${userId}_${weekId}`);

        // Set/Update the document with absolute coin value
        await setDoc(leaderboardDocRef, {
            userId,
            username,
            coins: totalCoins, // Absolute value
            photoURL: photoURL || null,
            weekId,
            lastUpdated: Timestamp.now()
        }, { merge: true });

    } catch (error) {
        console.error('Error syncing user to leaderboard:', error);
        // Don't throw, just log - we don't want to break the main flow
    }
};

// Get current week stats
export const getWeeklyStats = (): WeeklyStats => {
    const weekId = getCurrentWeekId();
    const startDate = getWeekStartDate();
    const endDate = getWeekEndDate();

    return {
        weekId,
        startDate,
        endDate,
        totalPlayers: 0 // This will be updated when fetching leaderboard
    };
};

// Reset weekly leaderboard (admin function - can be called manually or via Cloud Function)
export const resetWeeklyLeaderboard = async (): Promise<void> => {
    try {
        // This should ideally be done via Cloud Functions
        // For now, we'll just rely on weekId to separate weeks
        console.log('Weekly reset - new week started');
    } catch (error) {
        console.error('Error resetting weekly leaderboard:', error);
    }
};
