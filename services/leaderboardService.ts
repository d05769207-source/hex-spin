import { supabase, rpc, realtime } from '../supabaseClient';
import { LeaderboardEntry, WeeklyStats } from '../types';
import { getCurrentWeekId, getWeekStartDate, getWeekEndDate } from '../utils/weekUtils';

// Get weekly leaderboard data
export const getWeeklyLeaderboard = async (limitCount: number = 100, excludeBots: boolean = false): Promise<LeaderboardEntry[]> => {
    try {
        const weekId = getCurrentWeekId();

        const { data, error } = await supabase
            .from('weekly_leaderboard')
            .select('*')
            .eq('week_id', weekId)
            .order('coins', { ascending: false })
            .order('last_updated', { ascending: true }) // Tie-breaker 1: Earlier timestamp wins
            .order('total_spins', { ascending: false }) // Tie-breaker 2: More activity
            .order('level', { ascending: false }) // Tie-breaker 3: Higher level
            .order('username', { ascending: true }) // Final Tie-breaker: Alphabetical
            .limit(limitCount);

        if (error) {
            console.error('Error fetching weekly leaderboard:', error);
            return [];
        }

        const leaderboard: LeaderboardEntry[] = [];

        (data || []).forEach((entry, index) => {
            // Skip bots if excludeBots is true
            if (excludeBots && entry.user_id && entry.user_id.startsWith('bot_')) {
                return;
            }

            leaderboard.push({
                userId: entry.user_id,
                username: entry.username,
                coins: entry.coins || 0,
                photoURL: entry.photo_url,
                rank: index + 1
            });
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

    const unsubscribe = realtime.subscribeToLeaderboard(weekId, async () => {
        // Fetch fresh data on change
        const leaderboard = await getWeeklyLeaderboard(limitCount, excludeBots);
        callback(leaderboard);
    });

    // Initial fetch
    getWeeklyLeaderboard(limitCount, excludeBots).then(callback);

    return unsubscribe;
};

// Get user's rank in weekly leaderboard (Global Rank)
export const getUserRank = async (userId: string): Promise<number> => {
    try {
        const weekId = getCurrentWeekId();

        // Use RPC function for efficient rank calculation
        const { data, error } = await rpc.getUserRank(userId, weekId);

        if (error) {
            console.error('Error getting user rank:', error);
            return 0;
        }

        return data || 0;
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

        // Check if document exists
        const { data: existingEntry } = await supabase
            .from('weekly_leaderboard')
            .select('*')
            .eq('user_id', userId)
            .eq('week_id', weekId)
            .single();

        if (existingEntry) {
            // Update existing entry
            const updateData: any = {
                coins: existingEntry.coins + coinsToAdd,
                last_updated: new Date().toISOString()
            };

            if (photoURL) {
                updateData.photo_url = photoURL;
            }

            const { error } = await supabase
                .from('weekly_leaderboard')
                .update(updateData)
                .eq('user_id', userId)
                .eq('week_id', weekId);

            if (error) throw error;
        } else {
            // Create new entry
            const { error } = await supabase
                .from('weekly_leaderboard')
                .insert({
                    user_id: userId,
                    username,
                    coins: coinsToAdd,
                    photo_url: photoURL || null,
                    week_id: weekId,
                    last_updated: new Date().toISOString()
                });

            if (error) throw error;
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

        // Use RPC function for atomic sync
        const { error } = await rpc.syncUserToLeaderboard(
            userId,
            username,
            totalCoins,
            photoURL || null,
            totalSpins,
            level,
            weekId
        );

        if (error) {
            console.error('Error syncing user to leaderboard:', error);
            // Don't throw, just log - we don't want to break the main flow
        }
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

        const { data, error } = await supabase
            .from('weekly_leaderboard')
            .select('*')
            .eq('week_id', weekId)
            .order('coins', { ascending: false })
            .limit(300);

        if (error) {
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

        let realUsersCount = 0;
        let botsCount = 0;
        let realUsersTop100 = 0;
        let botsTop100 = 0;

        (data || []).forEach((entry, index) => {
            const isBot = entry.user_id && entry.user_id.startsWith('bot_');

            if (isBot) {
                botsCount++;
                if (index < 100) botsTop100++;
            } else {
                realUsersCount++;
                if (index < 100) realUsersTop100++;
            }
        });

        return {
            total: realUsersCount + botsCount,
            realUsers: realUsersCount,
            bots: botsCount,
            realUsersTop100,
            botsTop100,
            realUserPercentageTop100: realUsersTop100 > 0 ? (realUsersTop100 / Math.min(100, data?.length || 0)) * 100 : 0
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

// FORCE RESYNC: Manually sync a user's actual data to leaderboard
export const forceResyncUserToLeaderboard = async (userId: string): Promise<void> => {
    try {
        console.log(`🔄 Force resyncing user ${userId} to leaderboard...`);

        // Fetch user's actual data from their profile
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('uid', userId)
            .single();

        if (userError || !userData) {
            console.error(`❌ User ${userId} not found in database`);
            return;
        }

        const actualCoins = userData.coins || 0;
        const actualSpins = userData.total_spins || 0;
        const actualLevel = userData.level || 0;
        const username = userData.username || 'Player';
        const photoURL = userData.photo_url || null;

        console.log(`📊 User Data: ${username}, Coins: ${actualCoins}, Spins: ${actualSpins}, Level: ${actualLevel}`);

        // Force sync to leaderboard
        await syncUserToLeaderboard(
            userId,
            username,
            actualCoins,
            photoURL,
            actualSpins,
            actualLevel
        );

        console.log(`✅ Successfully resynced ${username} to leaderboard!`);

    } catch (error) {
        console.error('❌ Force resync failed:', error);
        throw error;
    }
};

// ONE-TIME REPAIR FUNCTION: Backfill missing fields
export const repairLeaderboardData = async () => {
    try {
        console.log('🔧 Starting Leaderboard Repair...');
        const weekId = getCurrentWeekId();

        // Get ALL docs for this week (without ordering, so we see the broken ones)
        const { data: entries, error } = await supabase
            .from('weekly_leaderboard')
            .select('*')
            .eq('week_id', weekId);

        if (error) {
            console.error('Error fetching leaderboard entries for repair:', error);
            return;
        }

        console.log(`Found ${entries?.length || 0} entries to check.`);
        let updateCount = 0;

        for (const entry of entries || []) {
            // Check if repair is needed (fields missing)
            if (entry.total_spins === undefined || entry.level === undefined) {
                let actualSpins = 0;
                let actualLevel = 0;

                // If it's a real user, try to fetch from their profile
                if (entry.user_id && !entry.user_id.startsWith('bot_')) {
                    try {
                        const { data: userProfile } = await supabase
                            .from('users')
                            .select('total_spins, level')
                            .eq('uid', entry.user_id)
                            .single();

                        if (userProfile) {
                            actualSpins = userProfile.total_spins || 0;
                            actualLevel = userProfile.level || 0;
                            console.log(`Recovered data for ${entry.username}: Spins=${actualSpins}, Level=${actualLevel}`);
                        }
                    } catch (e) {
                        console.warn(`Could not fetch profile for ${entry.username}, defaulting to 0`);
                    }
                }

                // Update the entry
                const { error: updateError } = await supabase
                    .from('weekly_leaderboard')
                    .update({
                        total_spins: actualSpins,
                        level: actualLevel
                    })
                    .eq('id', entry.id);

                if (!updateError) {
                    updateCount++;
                }
            }
        }

        if (updateCount > 0) {
            console.log(`✅ Repair Complete! Updated ${updateCount} documents.`);
        } else {
            console.log('✨ No repairs needed. All data is good.');
        }

    } catch (error) {
        console.error('❌ Repair Failed:', error);
    }
};
