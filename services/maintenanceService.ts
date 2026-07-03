import { supabase } from '../supabaseClient';
import { getCurrentWeekId } from '../utils/weekUtils';
import { deactivateAllBots, activateBotsForWeek } from './botService';

export interface GameStatus {
    maintenance_mode: boolean;
    spin_enabled: boolean;
    warning_active: boolean;
    warning_countdown: number;
    ready_countdown: number;
    maintenance_message: string;
    last_reset_time: number;
    last_batch_reset_week_id?: string;
}

export interface WinnerData {
    user_id: string;
    username: string;
    coins: number;
    photo_url?: string;
    rank: number;
    reward_amount: number;
    last_updated?: string;
}

// Initialize game status if not exists
export const initializeGameStatus = async (): Promise<void> => {
    try {
        const { data, error } = await supabase
            .from('game_status')
            .select('*')
            .eq('id', 'default')
            .single();

        if (error || !data) {
            await supabase
                .from('game_status')
                .upsert({
                    id: 'default',
                    maintenance_mode: false,
                    spin_enabled: true,
                    warning_active: false,
                    warning_countdown: 0,
                    ready_countdown: 0,
                    maintenance_message: '',
                    last_reset_time: 0,
                    last_batch_reset_week_id: ''
                });
        }
    } catch (error) {
        console.error('Error initializing game status:', error);
    }
};

// Force clear all maintenance mode states (use this to fix stuck countdowns)
export const forceClearMaintenanceMode = async (): Promise<void> => {
    console.log('🔧 Force clearing maintenance mode...');
    await supabase
        .from('game_status')
        .update({
            maintenance_mode: false,
            spin_enabled: true,
            warning_active: false,
            warning_countdown: 0,
            ready_countdown: 0,
            maintenance_message: ''
        })
        .eq('id', 'default');
    console.log('✅ Maintenance mode cleared!');
};

// Get current game status
export const getGameStatus = async (): Promise<GameStatus> => {
    try {
        const { data, error } = await supabase
            .from('game_status')
            .select('*')
            .eq('id', 'default')
            .single();

        if (error || !data) {
            return {
                maintenance_mode: false,
                spin_enabled: true,
                warning_active: false,
                warning_countdown: 0,
                ready_countdown: 0,
                maintenance_message: '',
                last_reset_time: 0
            };
        }

        return data as GameStatus;
    } catch (error) {
        console.error('Error getting game status:', error);
        return {
            maintenance_mode: false,
            spin_enabled: true,
            warning_active: false,
            warning_countdown: 0,
            ready_countdown: 0,
            maintenance_message: '',
            last_reset_time: 0
        };
    }
};

// Subscribe to game status changes (real-time)
export const subscribeToGameStatus = (callback: (status: GameStatus) => void): (() => void) => {
    const channel = supabase
        .channel('game_status_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'game_status',
                filter: 'id=eq.default'
            },
            async (payload) => {
                const status = payload.new as GameStatus || {
                    maintenance_mode: false,
                    spin_enabled: true,
                    warning_active: false,
                    warning_countdown: 0,
                    ready_countdown: 0,
                    maintenance_message: '',
                    last_reset_time: 0
                };
                callback(status);
            }
        )
        .subscribe();

    // Initial fetch
    getGameStatus().then(callback);

    return () => {
        supabase.removeChannel(channel);
    };
};

// Start maintenance mode with 15s warning
export const startMaintenanceMode = async (): Promise<void> => {
    console.log('🔴 Starting 15s warning countdown...');

    // Set warning active
    await supabase
        .from('game_status')
        .update({
            warning_active: true,
            warning_countdown: 15,
            maintenance_message: '⚠️ Winners announcement in progress!'
        })
        .eq('id', 'default');

    // Countdown from 15 to 0
    let countdown = 15;
    const intervalId = setInterval(async () => {
        countdown--;
        await supabase
            .from('game_status')
            .update({ warning_countdown: countdown })
            .eq('id', 'default');

        if (countdown <= 0) {
            clearInterval(intervalId);
            // Enable maintenance mode
            await supabase
                .from('game_status')
                .update({
                    warning_active: false,
                    warning_countdown: 0,
                    maintenance_mode: true,
                    spin_enabled: false,
                    maintenance_message: '🛠️ Maintenance in progress. Winners being calculated...'
                })
                .eq('id', 'default');
            console.log('🔴 Maintenance mode ENABLED. Spin disabled.');
        }
    }, 1000);
};

// End maintenance mode with 15s ready countdown
export const endMaintenanceMode = async (): Promise<void> => {
    console.log('🟢 Starting 15s ready countdown...');

    // Set ready countdown
    await supabase
        .from('game_status')
        .update({
            ready_countdown: 15,
            maintenance_message: '🎊 New week starting soon!'
        })
        .eq('id', 'default');

    // Countdown from 15 to 0
    let countdown = 15;
    const intervalId = setInterval(async () => {
        countdown--;
        await supabase
            .from('game_status')
            .update({ ready_countdown: countdown })
            .eq('id', 'default');

        if (countdown <= 0) {
            clearInterval(intervalId);

            // Activate bots for new week
            console.log('🤖 Activating bots for new week...');
            await activateBotsForWeek();

            // Disable maintenance mode
            await supabase
                .from('game_status')
                .update({
                    ready_countdown: 0,
                    maintenance_mode: false,
                    spin_enabled: true,
                    maintenance_message: '',
                    last_reset_time: Date.now()
                })
                .eq('id', 'default');
            console.log('🟢 Maintenance mode DISABLED. Spin enabled.');
        }
    }, 1000);
};

// Force enable/disable maintenance (admin override)
export const setMaintenanceMode = async (enabled: boolean): Promise<void> => {
    await supabase
        .from('game_status')
        .update({
            maintenance_mode: enabled,
            spin_enabled: !enabled,
            maintenance_message: enabled ? '🛠️ Maintenance in progress...' : ''
        })
        .eq('id', 'default');
    console.log(`Maintenance mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
};

// Get top winners from current week
export const getTopWinners = async (limit: number = 100): Promise<WinnerData[]> => {
    try {
        const weekId = getCurrentWeekId();

        const { data, error } = await supabase
            .from('weekly_leaderboard')
            .select('*')
            .eq('week_id', weekId);

        if (error) {
            console.error('Error fetching top winners:', error);
            return [];
        }

        const winners: WinnerData[] = (data || []).map((entry: any) => ({
            user_id: entry.user_id,
            username: entry.username,
            coins: entry.coins || 0,
            photo_url: entry.photo_url,
            rank: 0, // Will be set after sorting
            reward_amount: 0, // Will be calculated
            last_updated: entry.last_updated
        }));

        // Sort by coins (descending), then last_updated (ascending)
        winners.sort((a, b) => {
            if (b.coins !== a.coins) {
                return b.coins - a.coins; // Higher coins first
            }
            // Tie-breaker: Earlier time first
            const getTime = (date: string | undefined) => {
                if (!date) return 0;
                return new Date(date).getTime();
            };

            const timeA = getTime(a.last_updated);
            const timeB = getTime(b.last_updated);

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
            if (winner.rank === 1) winner.reward_amount = 10000;
            else if (winner.rank === 2) winner.reward_amount = 5000;
            else if (winner.rank === 3) winner.reward_amount = 3000;
            else if (winner.rank <= 10) winner.reward_amount = 1000;
            else if (winner.rank <= 50) winner.reward_amount = 500;
            else if (winner.rank <= 100) winner.reward_amount = 100;
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
            // Use RPC function for atomic update
            const { error } = await supabase.rpc('increment_user_coins', {
                p_user_id: winner.user_id,
                p_amount: winner.reward_amount
            });

            if (error) {
                console.error(`❌ Failed to distribute reward to ${winner.username}:`, error);
            } else {
                console.log(`✅ Reward ${winner.reward_amount} distributed to ${winner.username}`);
            }
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

        console.log(`🔥 Starting Batch Reset for Week: ${weekId}`);

        // --- 1. ACQUIRE LOCK ---
        // Prevent multiple admins from triggering reset simultaneously
        try {
            // Try INITIALIZE lock row if missing
            const { error: insertError } = await supabase
                .from('system')
                .insert({ id: 'batch_reset_lock', data: { is_in_progress: true, started_by: 'admin', start_time: new Date() } });

            if (insertError) {
                // Row exists, try to ACQUIRE lock if not already in progress
                const { count, error: updateError } = await supabase
                    .from('system')
                    .update({ data: { is_in_progress: true, started_by: 'admin', start_time: new Date() } })
                    .eq('id', 'batch_reset_lock')
                    .neq('data->>is_in_progress', 'true');

                if (updateError || !count || count === 0) {
                    console.warn("⚠️ Batch Reset halted: Another reset is currently in progress (Lock Active).");
                    throw new Error("Batch Reset is already running! Please wait.");
                }
            }
            console.log("🔒 Batch Reset Lock Acquired.");
        } catch (e) {
            console.error("Lock acquisition failed:", e);
            throw e;
        }

        try {
            // Fetch all users
            // Note: In production with thousands of users, we should paginate this or use an Edge Function.
            // For now (< 1000 users), fetching all is acceptable but risky.
            const { data: users, error } = await supabase
                .from('users')
                .select('*');

            if (error) throw error;
            if (!users || users.length === 0) return;

            const total = users.length;
            const batchSize = 10;

            console.log(`👥 Found ${total} users to process.`);

            // Process in chunks
            for (let i = 0; i < total; i += batchSize) {
                const batch = users.slice(i, i + batchSize);

                await Promise.all(batch.map(async (user: any) => {
                    try {
                        const previousCoins = user.coins || 0;
                        const eTokens = Math.min(Math.floor(previousCoins / 1000), 20);

                        // CRITICAL SAFETY CHECK:
                        // If user already has the current week ID (e.g. they logged in and Lazy Reset ran),
                        // DO NOT reset them again. This prevents double E-Token awards and data loss.
                        if (user.last_week_id === weekId) {
                            // console.log(`⏩ Skipping ${user.username} - Already reset.`);
                            return;
                        }

                        // Update user data
                        await supabase
                            .from('users')
                            .update({
                                coins: 0,
                                e_tokens: (user.e_tokens || 0) + eTokens,
                                last_week_id: weekId
                            })
                            .eq('uid', user.id);

                        // Only Reset Leaderboard if we actually processed the user
                        await supabase
                            .from('weekly_leaderboard')
                            .upsert({
                                user_id: user.id,
                                username: user.username || 'Player',
                                coins: 0,
                                photo_url: user.photoURL || null,
                                week_id: weekId,
                                last_updated: new Date().toISOString()
                            }, {
                                onConflict: 'user_id,week_id'
                            });
                    } catch (error) {
                        console.error(`❌ Failed to reset user ${user.username}:`, error);
                    }
                }));

                onProgress(Math.min(i + batchSize, total), total);
                console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} complete (${Math.min(i + batchSize, total)}/${total})`);
            }

            // Update Global Game Status
            console.log('✅ All users reset complete!');
            await supabase
                .from('game_status')
                .update({
                    last_batch_reset_week_id: weekId
                })
                .eq('id', 'default');

            // Deactivate all bots after user reset
            console.log('🤖 Deactivating all bots for weekly reset...');
            await deactivateAllBots();

        } finally {
            // --- RELEASE LOCK ---
            await supabase
                .from('system')
                .update({ data: { is_in_progress: false, end_time: new Date() } })
                .eq('id', 'batch_reset_lock');

            console.log("🔓 Batch Reset Lock Released.");
        }
    } catch (error) {
        console.error('❌ Error resetting users:', error);
        throw error;
    }
};
