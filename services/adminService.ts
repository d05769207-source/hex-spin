import { supabase } from '../supabaseClient';
import { User } from '../types';

export interface AdminStats {
    online_users: number;
    total_registrations: number;
    spins_today: number;
    rewards_distributed: number;
}

export interface UserListResult {
    users: User[];
    lastDoc: string | null;
}

// Get global stats for the dashboard
export const getDashboardStats = async (): Promise<AdminStats> => {
    try {
        // 1. Total Registrations
        const { count: totalRegistrations, error: totalError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (totalError) throw totalError;

        // 2. Online Users (Active in last 5 minutes)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const { count: onlineUsers, error: onlineError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gt('last_active', fiveMinsAgo);

        if (onlineError) throw onlineError;

        // 3. Spins Today (Using an estimate or global counter if available)
        // For now, we'll return 0 or a placeholder.
        // NOTE: Summing all users 'spins_today' is too expensive for a dashboard load.
        // We will implement a global counter in a future task if needed.
        const spins_today = 0;

        // 4. Rewards Distributed
        // Similarly, this would require a global counter or transaction log.
        const rewards_distributed = 0;

        return {
            online_users: onlineUsers || 0,
            total_registrations: totalRegistrations || 0,
            spins_today,
            rewards_distributed
        };
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        return {
            online_users: 0,
            total_registrations: 0,
            spins_today: 0,
            rewards_distributed: 0
        };
    }
};

// Get paginated users list
export const getUsersList = async (
    limitCount: number = 20,
    lastDoc: string | null = null,
    searchQuery: string = ''
): Promise<UserListResult> => {
    try {
        let query = supabase
            .from('users')
            .select('*');

        if (searchQuery) {
            // Simple search by username (case-insensitive using ILIKE)
            query = query
                .ilike('username', `%${searchQuery}%`)
                .limit(limitCount);
        } else {
            // Order by created_at descending
            query = query
                .order('created_at', { ascending: false })
                .limit(limitCount);

            // If we have a lastDoc, use it for pagination
            if (lastDoc) {
                query = query.gt('created_at', lastDoc);
            }
        }

        const { data, error } = await query;

        if (error) throw error;

        const users: User[] = (data || []).map((user: any) => {
            const lastActive = user.last_active ? new Date(user.last_active) : undefined;
            const createdAt = user.created_at ? new Date(user.created_at) : undefined;

            return {
                id: user.uid,
                uid: user.uid,
                email: user.email,
                username: user.username,
                isGuest: user.is_guest,
                eTokens: user.e_tokens,
                coins: user.coins, // Total Coins
                weeklyCoins: user.weekly_coins,
                photoURL: user.photo_url,
                displayId: user.display_id,
                referralCode: user.referral_code,
                createdAt: createdAt,
                lastActive: lastActive,
                spinsToday: user.spins_today,
                ip: user.ip || 'N/A',
                status: (lastActive && lastActive.getTime() > Date.now() - 5 * 60 * 1000) ? 'online' : 'offline'
            } as any;
        });

        // Get the last document's createdAt for pagination
        const newLastDoc = users.length > 0 ? users[users.length - 1].createdAt?.toISOString() || null : null;

        return {
            users: users as any[],
            lastDoc: newLastDoc
        };
    } catch (error) {
        console.error("Error fetching users list:", error);
        return { users: [], lastDoc: null };
    }
};
