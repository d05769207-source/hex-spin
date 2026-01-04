import { ref, set, get, onValue, update } from 'firebase/database';
import { collection, query, where, getDocs, doc, getDoc, runTransaction, increment } from 'firebase/firestore';
import { rtdb, db } from '../firebase';
import { getCurrentWeekId } from '../utils/weekUtils';
import { deactivateAllBots, activateBotsForWeek } from './botService';

export interface GameStatus {
    maintenanceMode: boolean;
    spinEnabled: boolean;
    warningActive: boolean;
    warningCountdown: number;
    readyCountdown: number;
    maintenanceMessage: string;
    lastResetTime: number;
}

export interface WinnerData {
    userId: string;
    username: string;
    coins: number;
    photoURL?: string;
    rank: number;
    rewardAmount: number;
    lastUpdated?: any; // Firestore Timestamp
}

// Game status reference
const gameStatusRef = ref(rtdb, 'gameStatus');

// Initialize game status if not exists
export const initializeGameStatus = async (): Promise<void> => {
    const snapshot = await get(gameStatusRef);
    if (!snapshot.exists()) {
        await set(gameStatusRef, {
            maintenanceMode: false,
            spinEnabled: true,
            warningActive: false,
            warningCountdown: 0,
            readyCountdown: 0,
            maintenanceMessage: '',
            lastResetTime: 0
        });
    }
};

// Get current game status
export const getGameStatus = async (): Promise<GameStatus> => {
    const snapshot = await get(gameStatusRef);
    return snapshot.val() || {
        maintenanceMode: false,
        spinEnabled: true,
        warningActive: false,
        warningCountdown: 0,
        readyCountdown: 0,
        maintenanceMessage: '',
        lastResetTime: 0
    };
};

// Subscribe to game status changes (real-time)
export const subscribeToGameStatus = (callback: (status: GameStatus) => void): (() => void) => {
    const unsubscribe = onValue(gameStatusRef, (snapshot) => {
        const status = snapshot.val() || {
            maintenanceMode: false,
            spinEnabled: true,
            warningActive: false,
            warningCountdown: 0,
            readyCountdown: 0,
            maintenanceMessage: '',
            lastResetTime: 0
        };
        callback(status);
    });

    return unsubscribe;
};

// Start maintenance mode with 15s warning
export const startMaintenanceMode = async (): Promise<void> => {
    console.log('🔴 Starting 15s warning countdown...');

    // Set warning active
    await update(gameStatusRef, {
        warningActive: true,
        warningCountdown: 15,
        maintenanceMessage: '⚠️ Winners announcement in progress!'
    });

    // Countdown from 15 to 0
    let countdown = 15;
    const intervalId = setInterval(async () => {
        countdown--;
        await update(gameStatusRef, { warningCountdown: countdown });

        if (countdown <= 0) {
            clearInterval(intervalId);
            // Enable maintenance mode
            await update(gameStatusRef, {
                warningActive: false,
                warningCountdown: 0,
                maintenanceMode: true,
                spinEnabled: false,
                maintenanceMessage: '🛠️ Maintenance in progress. Winners being calculated...'
            });
            console.log('🔴 Maintenance mode ENABLED. Spin disabled.');
        }
    }, 1000);
};

// End maintenance mode with 15s ready countdown
export const endMaintenanceMode = async (): Promise<void> => {
    console.log('🟢 Starting 15s ready countdown...');

    // Set ready countdown
    await update(gameStatusRef, {
        readyCountdown: 15,
        maintenanceMessage: '🎊 New week starting soon!'
    });

    // Countdown from 15 to 0
    let countdown = 15;
    const intervalId = setInterval(async () => {
        countdown--;
        await update(gameStatusRef, { readyCountdown: countdown });

        if (countdown <= 0) {
            clearInterval(intervalId);

            // Activate bots for new week
            console.log('🤖 Activating bots for new week...');
            await activateBotsForWeek();

            // Disable maintenance mode
            await update(gameStatusRef, {
                readyCountdown: 0,
                maintenanceMode: false,
                spinEnabled: true,
                maintenanceMessage: '',
                lastResetTime: Date.now()
            });
            console.log('🟢 Maintenance mode DISABLED. Spin enabled.');
        }
    }, 1000);
};

// Force enable/disable maintenance (admin override)
export const setMaintenanceMode = async (enabled: boolean): Promise<void> => {
    await update(gameStatusRef, {
        maintenanceMode: enabled,
        spinEnabled: !enabled,
        maintenanceMessage: enabled ? '🛠️ Maintenance in progress...' : ''
    });
    console.log(`Maintenance mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
};

// Get top winners from current week
export const getTopWinners = async (limit: number = 100): Promise<WinnerData[]> => {
    try {
        const weekId = getCurrentWeekId();
        const leaderboardRef = collection(db, 'weeklyLeaderboard');
        const q = query(
            leaderboardRef,
            where('weekId', '==', weekId)
        );

        const snapshot = await getDocs(q);
        const winners: WinnerData[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            winners.push({
                userId: data.userId,
                username: data.username,
                coins: data.coins || 0,
                photoURL: data.photoURL,
                rank: 0, // Will be set after sorting
                rewardAmount: 0, // Will be calculated
                lastUpdated: data.lastUpdated // Needed for tie-breaker sort
            });
        });

        // Sort by coins (descending), then lastUpdated (ascending)
        winners.sort((a, b) => {
            if (b.coins !== a.coins) {
                return b.coins - a.coins; // Higher coins first
            }
            // Tie-breaker: Earlier time first
            const getTime = (date: any) => {
                if (!date) return 0;
                if (typeof date.toMillis === 'function') return date.toMillis(); // Firestore Timestamp
                if (date instanceof Date) return date.getTime(); // JS Date
                if (date.seconds) return date.seconds * 1000; // Raw Timestamp object
                return 0;
            };

            const timeA = getTime((a as any).lastUpdated);
            const timeB = getTime((b as any).lastUpdated);

            const effectiveTimeA = timeA === 0 ? Number.MAX_SAFE_INTEGER : timeA;
            const effectiveTimeB = timeB === 0 ? Number.MAX_SAFE_INTEGER : timeB;

            // DEBUG: Append time to username for visual inspection
            if (a.username.includes("User A") && !a.username.includes("T:")) a.username = `${a.username} (T:${effectiveTimeA})`;
            if (a.username.includes("User B") && !a.username.includes("T:")) a.username = `${a.username} (T:${effectiveTimeB})`;
            if (b.username.includes("User A") && !b.username.includes("T:")) b.username = `${b.username} (T:${effectiveTimeA})`;
            if (b.username.includes("User B") && !b.username.includes("T:")) b.username = `${b.username} (T:${effectiveTimeB})`;

            return effectiveTimeA - effectiveTimeB;
        });

        // Assign ranks and calculate rewards
        winners.forEach((winner, index) => {
            winner.rank = index + 1;

            // Reward calculation logic
            if (winner.rank === 1) winner.rewardAmount = 10000;
            else if (winner.rank === 2) winner.rewardAmount = 5000;
            else if (winner.rank === 3) winner.rewardAmount = 3000;
            else if (winner.rank <= 10) winner.rewardAmount = 1000;
            else if (winner.rank <= 50) winner.rewardAmount = 500;
            else if (winner.rank <= 100) winner.rewardAmount = 100;
        });

        return winners.slice(0, limit);
    } catch (error) {
        console.error('Error fetching top winners:', error);
        return [];
    }
};

// Distribute rewards to winners
export const distributeRewards = async (
    winners: WinnerData[],
    onProgress: (current: number, total: number) => void
): Promise<void> => {
    const total = winners.length;

    for (let i = 0; i < total; i++) {
        const winner = winners[i];

        try {
            const userRef = doc(db, 'users', winner.userId);
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userRef);

                if (userDoc.exists()) {
                    transaction.update(userRef, {
                        inrBalance: increment(winner.rewardAmount)
                    });
                }
            });

            console.log(`✅ Reward ${winner.rewardAmount} distributed to ${winner.username}`);
        } catch (error) {
            console.error(`❌ Failed to distribute reward to ${winner.username}:`, error);
        }

        onProgress(i + 1, total);
    }
};

// Reset all users' data (batched) - FIXED to include ALL users
export const resetAllUsersData = async (
    onProgress: (current: number, total: number) => void
): Promise<void> => {
    try {
        const weekId = getCurrentWeekId();

        // FIXED: Get ALL users from users collection (not just leaderboard)
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        const allUsers = snapshot.docs.map(doc => ({
            userId: doc.id,
            ...doc.data()
        }));

        const total = allUsers.length;
        const batchSize = 500;

        console.log(`🔄 Starting batch reset for ${total} users (${batchSize} per batch)...`);

        // Process in batches
        for (let i = 0; i < total; i += batchSize) {
            const batch = allUsers.slice(i, i + batchSize);

            // Process batch in parallel
            await Promise.all(batch.map(async (user: any) => {
                // Skip guest users
                if (user.isGuest) return;

                const eTokens = Math.min(Math.floor((user.coins || 0) / 1000), 20); // Cap at 20 E-Tokens

                try {
                    await runTransaction(db, async (transaction) => {
                        const userRef = doc(db, 'users', user.userId);
                        const userDoc = await transaction.get(userRef);

                        if (userDoc.exists()) {
                            transaction.update(userRef, {
                                coins: 0,
                                eTokens: increment(eTokens),
                                lastWeekId: weekId
                            });
                        }

                        // Reset/Create leaderboard entry
                        const lbRef = doc(db, 'weeklyLeaderboard', `${user.userId}_${weekId}`);
                        transaction.set(lbRef, {
                            userId: user.userId,
                            username: user.username || 'Player',
                            coins: 0,
                            photoURL: user.photoURL || null,
                            weekId: weekId,
                            lastUpdated: new Date()
                        }, { merge: true });
                    });
                } catch (error) {
                    console.error(`❌ Failed to reset user ${user.username}:`, error);
                }
            }));

            onProgress(Math.min(i + batchSize, total), total);
            console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} complete (${Math.min(i + batchSize, total)}/${total})`);
        }

        console.log('✅ All users reset complete!');

        // Deactivate all bots after user reset
        console.log('🤖 Deactivating all bots for weekly reset...');
        await deactivateAllBots();
    } catch (error) {
        console.error('❌ Error resetting users:', error);
        throw error;
    }
};
