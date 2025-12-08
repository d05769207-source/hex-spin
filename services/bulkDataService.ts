import { collection, getDocs, doc, writeBatch, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentWeekId } from '../utils/weekUtils';

/**
 * DELETE ALL test users and leaderboard data (DANGEROUS!)
 */
export const deleteAllTestData = async (
    onProgress: (current: number, total: number) => void
): Promise<void> => {
    try {
        console.log('🗑️ DELETING ALL test data...');

        // Step 1: Delete all users
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);

        const totalUsers = usersSnapshot.size;
        console.log(`Found ${totalUsers} users to delete`);

        let deleted = 0;
        const batchSize = 500;

        for (let i = 0; i < totalUsers; i += batchSize) {
            const batch = writeBatch(db);
            const users = usersSnapshot.docs.slice(i, i + batchSize);

            users.forEach((userDoc) => {
                batch.delete(doc(db, 'users', userDoc.id));
            });

            await batch.commit();
            deleted += users.length;
            onProgress(deleted, totalUsers * 2); // *2 because we delete users + leaderboard
            console.log(`✅ Deleted users batch (${deleted}/${totalUsers})`);
        }

        // Step 2: Delete all leaderboard entries
        const leaderboardRef = collection(db, 'weeklyLeaderboard');
        const lbSnapshot = await getDocs(leaderboardRef);

        const totalLB = lbSnapshot.size;
        console.log(`Found ${totalLB} leaderboard entries to delete`);

        for (let i = 0; i < totalLB; i += batchSize) {
            const batch = writeBatch(db);
            const entries = lbSnapshot.docs.slice(i, i + batchSize);

            entries.forEach((entryDoc) => {
                batch.delete(doc(db, 'weeklyLeaderboard', entryDoc.id));
            });

            await batch.commit();
            deleted += entries.length;
            onProgress(deleted, totalUsers + totalLB);
            console.log(`✅ Deleted leaderboard batch (${i + entries.length}/${totalLB})`);
        }

        console.log('✅ ALL test data deleted from Firebase!');
    } catch (error) {
        console.error('❌ Error deleting test data:', error);
        throw error;
    }
};

/**
 * Reset ALL users data to 0 (not just leaderboard users)
 */
export const resetAllUsersToZero = async (
    onProgress: (current: number, total: number) => void
): Promise<void> => {
    try {
        console.log('🔄 Resetting ALL users to zero...');

        // Get ALL users from users collection
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        const total = snapshot.size;
        console.log(`Found ${total} users to reset`);

        const batchSize = 500;
        let processed = 0;

        // Process in batches
        for (let i = 0; i < total; i += batchSize) {
            const batch = writeBatch(db);
            const users = snapshot.docs.slice(i, i + batchSize);

            users.forEach((userDoc) => {
                const userRef = doc(db, 'users', userDoc.id);
                batch.update(userRef, {
                    coins: 0,
                    tokens: 0,
                    eTokens: 0,
                    ktmTokens: 0,
                    iphoneTokens: 0,
                    totalSpins: 0,
                    spinsToday: 0,
                    level: 1,
                    superModeSpinsLeft: 0,
                    superModeEndTime: null
                });
            });

            await batch.commit();
            processed += users.length;
            onProgress(processed, total);
            console.log(`✅ Reset batch complete (${processed}/${total})`);
        }

        console.log('✅ All users reset to zero!');
    } catch (error) {
        console.error('❌ Error resetting users:', error);
        throw error;
    }
};

/**
 * Add test data to ALL users (coins, tokens, spins, level)
 */
export const populateTestData = async (
    minCoins: number,
    maxCoins: number,
    tokens: number,
    spins: number,
    level: number,
    onProgress: (current: number, total: number) => void
): Promise<void> => {
    try {
        console.log('🎲 Populating test data for all users...');

        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        const total = snapshot.size;
        const batchSize = 500;
        let processed = 0;

        for (let i = 0; i < total; i += batchSize) {
            const batch = writeBatch(db);
            const users = snapshot.docs.slice(i, i + batchSize);

            users.forEach((userDoc) => {
                const userData = userDoc.data();

                // Random coins between min and max
                const randomCoins = Math.floor(Math.random() * (maxCoins - minCoins + 1)) + minCoins;

                const userRef = doc(db, 'users', userDoc.id);
                batch.update(userRef, {
                    coins: randomCoins,
                    tokens: tokens,
                    totalSpins: spins,
                    level: level
                });
            });

            await batch.commit();
            processed += users.length;
            onProgress(processed, total);
            console.log(`✅ Test data batch complete (${processed}/${total})`);
        }

        console.log('✅ Test data populated for all users!');
    } catch (error) {
        console.error('❌ Error populating test data:', error);
        throw error;
    }
};

/**
 * Sync ALL users to leaderboard (not just those with existing entries)
 */
export const syncAllUsersToLeaderboard = async (
    onProgress: (current: number, total: number) => void
): Promise<void> => {
    try {
        console.log('📊 Syncing ALL users to leaderboard...');

        const weekId = getCurrentWeekId();
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);

        const total = snapshot.size;
        const batchSize = 500;
        let processed = 0;

        for (let i = 0; i < total; i += batchSize) {
            const batch = writeBatch(db);
            const users = snapshot.docs.slice(i, i + batchSize);

            users.forEach((userDoc) => {
                const userData = userDoc.data();

                // Skip guest users
                if (userData.isGuest) return;

                const leaderboardDocRef = doc(db, 'weeklyLeaderboard', `${userDoc.id}_${weekId}`);
                batch.set(leaderboardDocRef, {
                    userId: userDoc.id,
                    username: userData.username || 'Player',
                    coins: userData.coins || 0,
                    photoURL: userData.photoURL || null,
                    weekId: weekId,
                    lastUpdated: new Date()
                }, { merge: true });
            });

            await batch.commit();
            processed += users.length;
            onProgress(processed, total);
            console.log(`✅ Leaderboard sync batch complete (${processed}/${total})`);
        }

        console.log('✅ All users synced to leaderboard!');
    } catch (error) {
        console.error('❌ Error syncing to leaderboard:', error);
        throw error;
    }
};

/**
 * Complete reset workflow: Reset + Populate + Sync
 */
export const bulkResetAndPopulate = async (
    config: {
        minCoins: number;
        maxCoins: number;
        tokens: number;
        spins: number;
        level: number;
    },
    onProgress: (step: string, current: number, total: number) => void
): Promise<void> => {
    try {
        // Step 1: Reset to zero
        onProgress('Resetting all data...', 0, 100);
        await resetAllUsersToZero((current, total) => {
            const percent = Math.floor((current / total) * 33);
            onProgress('Resetting all data...', percent, 100);
        });

        // Step 2: Populate test data
        onProgress('Adding test data...', 33, 100);
        await populateTestData(
            config.minCoins,
            config.maxCoins,
            config.tokens,
            config.spins,
            config.level,
            (current, total) => {
                const percent = 33 + Math.floor((current / total) * 33);
                onProgress('Adding test data...', percent, 100);
            }
        );

        // Step 3: Sync to leaderboard
        onProgress('Syncing to leaderboard...', 66, 100);
        await syncAllUsersToLeaderboard((current, total) => {
            const percent = 66 + Math.floor((current / total) * 34);
            onProgress('Syncing to leaderboard...', percent, 100);
        });

        onProgress('Complete!', 100, 100);
        console.log('✅ Bulk reset and populate complete!');
    } catch (error) {
        console.error('❌ Error in bulk operation:', error);
        throw error;
    }
};
