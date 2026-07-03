import { createClient } from '@supabase/supabase-js';

// ============================================
// Supabase Configuration
// ============================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ============================================
// Supabase Client
// ============================================

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    },
    global: {
        headers: {
            'X-Client-Info': 'hexfire-royal-spin'
        }
    }
});

// ============================================
// Database Helpers
// ============================================

export const db = {
    users: () => supabase.from('users'),
    weeklyLeaderboard: () => supabase.from('weekly_leaderboard'),
    mailbox: () => supabase.from('mailbox'),
    botUsers: () => supabase.from('bot_users'),
    lotteryParticipants: () => supabase.from('sunday_lottery_participants'),
    events: () => supabase.from('events'),
    counters: () => supabase.from('counters'),
    system: () => supabase.from('system'),
    gameStatus: () => supabase.from('game_status')
};

// ============================================
// Auth Helpers
// ============================================

export const auth = supabase.auth;

// ============================================
// Storage Helpers
// ============================================

export const storage = {
    profilePhotos: () => supabase.storage.from('profile-photos')
};

// ============================================
// RPC Functions (PostgreSQL Functions)
// ============================================

export const rpc = {
    // User increment functions
    incrementUserETokens: (userUid: string, amount: number) =>
        supabase.rpc('increment_user_etokens', { user_uid: userUid, amount }),

    incrementUserCoins: (userUid: string, amount: number) =>
        supabase.rpc('increment_user_coins', { user_uid: userUid, amount }),

    incrementUserTokens: (userUid: string, amount: number) =>
        supabase.rpc('increment_user_tokens', { user_uid: userUid, amount }),

    incrementUserKtmTokens: (userUid: string, amount: number) =>
        supabase.rpc('increment_user_ktm_tokens', { user_uid: userUid, amount }),

    incrementUserIphoneTokens: (userUid: string, amount: number) =>
        supabase.rpc('increment_user_iphone_tokens', { user_uid: userUid, amount }),

    incrementUserTotalSpins: (userUid: string, amount: number) =>
        supabase.rpc('increment_user_total_spins', { user_uid: userUid, amount }),

    incrementUserSpinsToday: (userUid: string, amount: number) =>
        supabase.rpc('increment_user_spins_today', { user_uid: userUid, amount }),

    // User ID functions
    getNextUserId: () =>
        supabase.rpc('get_next_user_id'),

    // Weekly reset functions
    weeklyResetUser: (userUid: string, currentWeekId: string, eTokensToEarn: number) =>
        supabase.rpc('weekly_reset_user', {
            user_uid: userUid,
            current_week_id: currentWeekId,
            e_tokens_to_earn: eTokensToEarn
        }),

    // Leaderboard functions
    syncUserToLeaderboard: (
        userUid: string,
        username: string,
        coins: number,
        photoUrl: string | null,
        totalSpins: number,
        level: number,
        weekId: string
    ) =>
        supabase.rpc('sync_user_to_leaderboard', {
            p_user_uid: userUid,
            p_user_username: username,
            p_user_coins: coins,
            p_user_photo_url: photoUrl,
            p_user_total_spins: totalSpins,
            p_user_level: level,
            p_week_id: weekId
        }),

    getUserRank: (userUid: string, weekId: string) =>
        supabase.rpc('get_user_rank', { p_user_uid: userUid, p_week_id: weekId }),

    // Mailbox functions
    claimMailboxMessage: (messageId: string, userUid: string) =>
        supabase.rpc('claim_mailbox_message', { message_id: messageId, user_uid: userUid }),

    // Bot generation function
    generateBotUser: (
        uid: string,
        username: string,
        photoUrl: string,
        level: number,
        totalSpins: number,
        coins: number,
        botTier: string,
        weekId: string,
        displayId: number,
        eTokens: number,
        tokens: number
    ) =>
        supabase.rpc('generate_bot_user', {
            p_uid: uid,
            p_username: username,
            p_photo_url: photoUrl,
            p_level: level,
            p_total_spins: totalSpins,
            p_coins: coins,
            p_bot_tier: botTier,
            p_week_id: weekId,
            p_display_id: displayId,
            p_e_tokens: eTokens,
            p_tokens: tokens
        }),

    // Bot cleanup functions
    retireOldBots: () => supabase.rpc('retire_old_bots'),

    hardDeleteAllBots: () => supabase.rpc('hard_delete_all_bots'),

    // System functions
    acquireBotLock: (lockId: string, clientId: string) =>
        supabase.rpc('acquire_bot_lock', { p_lock_id: lockId, p_client_id: clientId }),

    updateReservedIds: (ids: number[], currentLevel: number, levelPools: any) =>
        supabase.rpc('update_reserved_ids', {
            p_ids: ids,
            p_current_level: currentLevel,
            p_level_pools: levelPools
        }),

    updateReservedIdsConfig: (currentLevel: number) =>
        supabase.rpc('update_reserved_ids_config', { p_current_level: currentLevel }),

    updateBotStats: (uid: string, weekId: string, amount: number, spinsToAdd: number) =>
        supabase.rpc('update_bot_stats', {
            p_uid: uid,
            p_week_id: weekId,
            p_amount: amount,
            p_spins_to_add: spinsToAdd
        }),

    generateDemoLeaderboard: (weekId: string, count: number) =>
        supabase.rpc('generate_demo_leaderboard', {
            p_week_id: weekId,
            p_count: count
        }),

    markBotPhotoUsed: (photoId: string, botUid: string, displayId: number) =>
        supabase.rpc('mark_bot_photo_used', {
            p_photo_id: photoId,
            p_bot_uid: botUid,
            p_display_id: displayId
        })
};

// ============================================
// Realtime Helpers
// ============================================

export const realtime = {
    subscribeToGameStatus: (callback: (data: any) => void) => {
        const channel = supabase
            .channel('game-status-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'game_status'
                },
                (payload) => callback(payload.new)
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    },

    subscribeToLeaderboard: (weekId: string, callback: () => void) => {
        const channelId = `leaderboard-changes-${Date.now()}-${Math.random()}`;
        const channel = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'weekly_leaderboard',
                    filter: `week_id=eq.${weekId}`
                },
                callback
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    },

    subscribeToUserChanges: (userUid: string, callback: (data: any) => void) => {
        const channelId = `user-${userUid}-changes-${Date.now()}-${Math.random()}`;
        const channel = supabase
            .channel(channelId)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: `uid=eq.${userUid}`
                },
                (payload) => callback(payload.new)
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    },

    subscribeToMailbox: (userUid: string, callback: () => void) => {
        const channel = supabase
            .channel(`mailbox-${userUid}-changes`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'mailbox',
                    filter: `user_id=eq.${userUid}`
                },
                callback
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }
};

// ============================================
// Export default
// ============================================

export default supabase;
