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
    increment,
    getCountFromServer,
    writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { LeaderboardEntry, WeeklyStats } from '../types';
import { getCurrentWeekId, getWeekStartDate, getWeekEndDate } from '../utils/weekUtils';

// Get weekly leaderboard data
export const getWeeklyLeaderboard = async (limitCount: number = 100, excludeBots: boolean = false): Promise<LeaderboardEntry[]> => {
    try {
        const weekId = getCurrentWeekId();
        const leaderboardRef = collection(db, 'weeklyLeaderboard');
        const q = query(
            leaderboardRef,
            where('weekId', '==', weekId),
            orderBy('coins', 'desc'),
            orderBy('lastUpdated', 'asc'), // Tie-breaker 1: Earlier timestamp wins (First come, first served)
            orderBy('totalSpins', 'desc'), // Tie-breaker 2: More activity
            orderBy('level', 'desc'),      // Tie-breaker 3: Higher level
            orderBy('username', 'asc'),    // Final Tie-breaker: Alphabetical
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        const leaderboard: LeaderboardEntry[] = [];

        let index = 0;
        snapshot.forEach((doc) => {
            const data = doc.data();

            // Skip bots if excludeBots is true
            if (excludeBots && data.userId && data.userId.startsWith('bot_')) {
                return;
            }

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
    limitCount: number = 100,
    excludeBots: boolean = false
) => {
    const weekId = getCurrentWeekId();
    const leaderboardRef = collection(db, 'weeklyLeaderboard');
    const q = query(
        leaderboardRef,
        where('weekId', '==', weekId),
        orderBy('coins', 'desc'),
        orderBy('lastUpdated', 'asc'), // Tie-breaker 1: Earlier timestamp wins
        orderBy('totalSpins', 'desc'), // Tie-breaker 2: More activity
        orderBy('level', 'desc'),      // Tie-breaker 3: Higher level
        orderBy('username', 'asc'),    // Final Tie-breaker: Alphabetical
        limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
        const leaderboard: LeaderboardEntry[] = [];
        let index = 0;
        snapshot.forEach((doc) => {
            const data = doc.data();

            // Skip bots if excludeBots is true
            if (excludeBots && data.userId && data.userId.startsWith('bot_')) {
                return;
            }

            leaderboard.push({
                userId: data.userId,
                username: data.username,
                coins: data.coins || 0,
                photoURL: data.photoURL,
                totalSpins: data.totalSpins || 0,
                level: data.level || 0,
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

// Get user's rank in weekly leaderboard (Global Rank)
export const getUserRank = async (userId: string): Promise<number> => {
    try {
        const weekId = getCurrentWeekId();
        const leaderboardRef = collection(db, 'weeklyLeaderboard');

        // 1. Get current user's coins
        const userDocRef = doc(db, 'weeklyLeaderboard', `${userId}_${weekId}`);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return 0; // User hasn't played this week
        }

        const userCoins = userDoc.data().coins || 0;

        // 2. Count users with MORE coins than current user
        const q = query(
            leaderboardRef,
            where('weekId', '==', weekId),
            where('coins', '>', userCoins)
        );

        const snapshot = await getCountFromServer(q);
        const count = snapshot.data().count;

        // Rank is count + 1 (e.g. if 5 people have more coins, I am #6)
        return count + 1;

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
            const updateData: any = {
                coins: increment(coinsToAdd),
                lastUpdated: Timestamp.now()
            };

            if (photoURL) {
                updateData.photoURL = photoURL;
            }

            await updateDoc(leaderboardDocRef, updateData);
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
    photoURL?: string,
    totalSpins: number = 0,
    level: number = 0
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
            totalSpins: totalSpins,
            level: level,
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

// Get leaderboard analytics (real users vs bots)
export const getLeaderboardAnalytics = async () => {
    try {
        const weekId = getCurrentWeekId();
        const leaderboardRef = collection(db, 'weeklyLeaderboard');
        const q = query(
            leaderboardRef,
            where('weekId', '==', weekId),
            orderBy('coins', 'desc'),
            limit(300)
        );

        const snapshot = await getDocs(q);
        let realUsersCount = 0;
        let botsCount = 0;
        let realUsersTop100 = 0;
        let botsTop100 = 0;

        let index = 0;
        snapshot.forEach((doc) => {
            const data = doc.data();
            const isBot = data.userId && data.userId.startsWith('bot_');

            if (isBot) {
                botsCount++;
                if (index < 100) botsTop100++;
            } else {
                realUsersCount++;
                if (index < 100) realUsersTop100++;
            }
            index++;
        });

        return {
            total: realUsersCount + botsCount,
            realUsers: realUsersCount,
            bots: botsCount,
            realUsersTop100,
            botsTop100,
            realUserPercentageTop100: realUsersTop100 > 0 ? (realUsersTop100 / Math.min(100, index)) * 100 : 0
        };
    } catch (error) {
        console.error('Error getting leaderboard analytics:', error);
        return {
            total: 0,
            realUsers: 0,
            bots: 0,
            realUsersTop100: 0,
            botsTop100: 0,
            realUserPercentageTop100: 0
        };
    }
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

// ONE-TIME REPAIR FUNCTION: Backfill missing fields
export const repairLeaderboardData = async () => {
    try {
        console.log('🔧 Starting Leaderboard Repair...');
        const weekId = getCurrentWeekId();
        const leaderboardRef = collection(db, 'weeklyLeaderboard');
        // Get ALL docs for this week (without ordering, so we see the broken ones)
        const q = query(leaderboardRef, where('weekId', '==', weekId));
        const snapshot = await getDocs(q);

        console.log(`Found ${snapshot.size} entries to check.`);
        const batch = writeBatch(db);
        let updateCount = 0;

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();

            // Check if repair is needed (fields missing)
            if (data.totalSpins === undefined || data.level === undefined) {
                let actualSpins = 0;
                let actualLevel = 0;

                // If it's a real user, try to fetch from their profile
                if (data.userId && !data.userId.startsWith('bot_')) {
                    try {
                        const userProfileSnap = await getDoc(doc(db, 'users', data.userId));
                        if (userProfileSnap.exists()) {
                            const userData = userProfileSnap.data();
                            actualSpins = userData.totalSpins || 0;
                            actualLevel = userData.level || 0;
                            console.log(`Recovered data for ${data.username}: Spins=${actualSpins}, Level=${actualLevel}`);
                        }
                    } catch (e) {
                        console.warn(`Could not fetch profile for ${data.username}, defaulting to 0`);
                    }
                }

                batch.update(docSnap.ref, {
                    totalSpins: actualSpins,
                    level: actualLevel
                });
                updateCount++;
            }
        }

        if (updateCount > 0) {
            await batch.commit();
            console.log(`✅ Repair Complete! Updated ${updateCount} documents.`);
        } else {
            console.log('✨ No repairs needed. All data is good.');
        }

    } catch (error) {
        console.error('❌ Repair Failed:', error);
    }
};
