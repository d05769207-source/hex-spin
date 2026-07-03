import { supabase } from '../supabaseClient';
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
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('uid');

        if (usersError) throw usersError;

        const totalUsers = usersData?.length || 0;
        console.log(`Found ${totalUsers} users to delete`);

        let deleted = 0;
        const batchSize = 500;

        for (let i = 0; i < totalUsers; i += batchSize) {
            const batch = usersData?.slice(i, i + batchSize) || [];

            for (const user of batch) {
                await supabase.from('users').delete().eq('uid', user.uid);
            }

            deleted += batch.length;
            onProgress(deleted, totalUsers * 2); // *2 because we delete users + leaderboard
            console.log(`✅ Deleted users batch (${deleted}/${totalUsers})`);
        }

        // Step 2: Delete all leaderboard entries
        const { data: lbData, error: lbError } = await supabase
            .from('weekly_leaderboard')
            .select('user_id');

        if (lbError) throw lbError;

        const totalLB = lbData?.length || 0;
        console.log(`Found ${totalLB} leaderboard entries to delete`);

        for (let i = 0; i < totalLB; i += batchSize) {
            const batch = lbData?.slice(i, i + batchSize) || [];

            for (const entry of batch) {
                await supabase.from('weekly_leaderboard').delete().eq('user_id', entry.user_id);
            }

            deleted += batch.length;
            onProgress(deleted, totalUsers + totalLB);
            console.log(`✅ Deleted leaderboard batch (${i + batch.length}/${totalLB})`);
        }

        console.log('✅ ALL test data deleted from Supabase!');
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
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('uid');

        if (usersError) throw usersError;

        const total = usersData?.length || 0;
        console.log(`Found ${total} users to reset`);

        const batchSize = 500;
        let processed = 0;

        // Process in batches
        for (let i = 0; i < total; i += batchSize) {
            const batch = usersData?.slice(i, i + batchSize) || [];

            for (const user of batch) {
                await supabase
                    .from('users')
                    .update({
                        coins: 0,
                        tokens: 0,
                        e_tokens: 0,
                        ktm_tokens: 0,
                        iphone_tokens: 0,
                        total_spins: 0,
                        spins_today: 0,
                        level: 1,
                        super_mode_spins_left: 0,
                        super_mode_end_time: null
                    })
                    .eq('uid', user.uid);
            }

            processed += batch.length;
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

        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('uid');

        if (usersError) throw usersError;

        const total = usersData?.length || 0;
        const batchSize = 500;
        let processed = 0;

        for (let i = 0; i < total; i += batchSize) {
            const batch = usersData?.slice(i, i + batchSize) || [];

            for (const user of batch) {
                // Random coins between min and max
                const randomCoins = Math.floor(Math.random() * (maxCoins - minCoins + 1)) + minCoins;

                await supabase
                    .from('users')
                    .update({
                        coins: randomCoins,
                        tokens: tokens,
                        total_spins: spins,
                        level: level
                    })
                    .eq('uid', user.uid);
            }

            processed += batch.length;
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

        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('uid, username, coins, photo_url, is_guest');

        if (usersError) throw usersError;

        const total = usersData?.length || 0;
        const batchSize = 500;
        let processed = 0;

        for (let i = 0; i < total; i += batchSize) {
            const batch = usersData?.slice(i, i + batchSize) || [];

            for (const user of batch) {
                // Skip guest users
                if (user.is_guest) continue;

                await supabase
                    .from('weekly_leaderboard')
                    .upsert({
                        user_id: user.uid,
                        username: user.username || 'Player',
                        coins: user.coins || 0,
                        photo_url: user.photo_url || null,
                        week_id: weekId,
                        last_updated: new Date().toISOString()
                    }, {
                        onConflict: 'user_id,week_id'
                    });
            }

            processed += batch.length;
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


// --- VERIFICATION HELPERS ---

export const clearTestUsers = deleteAllTestData; // Alias for AdminDashboard

/**
 * Verify Tie-Breaker Logic (Time-based)
 */
export const verifyTieBreaker = async (): Promise<string> => {
    try {
        console.log('🧪 Starting Tie-Breaker Verification...');
        const weekId = getCurrentWeekId();

        // 1. Create User A (Early Scorer)
        const userA_ID = 'test_A_' + Date.now();
        const timeA = new Date(Date.now() - 1000 * 60 * 10); // 10 mins ago

        await supabase
            .from('weekly_leaderboard')
            .upsert({
                user_id: userA_ID,
                username: 'User A (Early)',
                coins: 5000,
                week_id: weekId,
                last_updated: timeA.toISOString()
            }, {
                onConflict: 'user_id,week_id'
            });

        // 2. Create User B (Late Scorer)
        const userB_ID = 'test_B_' + Date.now();
        const timeB = new Date(); // Now

        await supabase
            .from('weekly_leaderboard')
            .upsert({
                user_id: userB_ID,
                username: 'User B (Late)',
                coins: 5000, // SAME SCORE
                week_id: weekId,
                last_updated: timeB.toISOString()
            }, {
                onConflict: 'user_id,week_id'
            });

        await new Promise(r => setTimeout(r, 2000));
        console.log('✅ Created test users A and B with same score (5000). Fetching ranks...');

        // 3. Fetch Leaderboard to check Ranks
        const { data, error } = await supabase
            .from('weekly_leaderboard')
            .select('*')
            .eq('week_id', weekId)
            .order('coins', { ascending: false })
            .order('last_updated', { ascending: true }) // Tie-breaker: Earlier time is better
            .limit(50);

        if (error) throw error;

        let rankA = -1;
        let rankB = -1;

        (data || []).forEach((entry, index) => {
            if (entry.user_id === userA_ID) rankA = index + 1;
            if (entry.user_id === userB_ID) rankB = index + 1;
        });

        // Cleanup
        await supabase.from('weekly_leaderboard').delete().eq('user_id', userA_ID);
        await supabase.from('weekly_leaderboard').delete().eq('user_id', userB_ID);

        if (rankA === -1 || rankB === -1) return "❌ Failed: Could not find test users in top 50.";

        let result = `📊 Result:\nUser A (Early): Rank ${rankA}\nUser B (Late): Rank ${rankB}\n`;
        if (rankA < rankB) {
            result += "✅ PASS: Early user ranked higher!";
        } else {
            result += "❌ FAIL: Late user ranked higher (or same).";
        }
        return result;

    } catch (error) {
        console.error(error);
        return "Error running test: " + error;
    }
};
