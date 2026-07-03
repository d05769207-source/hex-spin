import { supabase, rpc, realtime } from '../supabaseClient';
import { MailboxMessage, MessageType, MessageStatus } from '../types';

/**
 * Create a weekly reward message in user's inbox
 * Called after weekly reset when coins are converted to E-Tokens
 */
export const createWeeklyRewardMessage = async (
    userId: string,
    eTokensEarned: number,
    sourceCoins: number
): Promise<string> => {
    try {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

        const { data, error } = await supabase
            .from('mailbox')
            .insert({
                user_id: userId,
                type: MessageType.WEEKLY_REWARD,
                title: '🎁 Weekly Reward Available!',
                description: `Your ${sourceCoins.toLocaleString()} coins have been converted to ${eTokensEarned} E-Token${eTokensEarned > 1 ? 's' : ''}. Claim your reward within 7 days!`,
                created_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
                status: MessageStatus.UNREAD,
                reward_type: 'E_TOKEN',
                reward_amount: eTokensEarned,
                source_coins: sourceCoins,
                is_expired: false
            })
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Weekly reward message created:', data.id);
        return data.id;
    } catch (error) {
        console.error('❌ Error creating weekly reward message:', error);
        throw error;
    }
};

/**
 * Get all messages for a user (non-expired, non-claimed)
 */
export const getUserMessages = async (userId: string): Promise<MailboxMessage[]> => {
    try {
        const { data, error } = await supabase
            .from('mailbox')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching user messages:', error);
            return [];
        }

        const messages: MailboxMessage[] = (data || []).map(msg => ({
            id: msg.id,
            userId: msg.user_id,
            type: msg.type,
            title: msg.title,
            description: msg.description,
            createdAt: new Date(msg.created_at),
            expiresAt: new Date(msg.expires_at),
            status: msg.status,
            rewardType: msg.reward_type,
            rewardAmount: msg.reward_amount,
            sourceCoins: msg.source_coins,
            isExpired: false,
            claimedAt: msg.claimed_at ? new Date(msg.claimed_at) : undefined
        }));

        console.log(`✅ Fetched ${messages.length} messages for user ${userId}`);
        return messages;
    } catch (error) {
        console.error('❌ Error fetching user messages:', error);
        return [];
    }
};

/**
 * Claim a reward message
 * Updates user's E-Tokens and marks message as claimed
 */
export const claimMessage = async (
    messageId: string,
    userId: string
): Promise<{ success: boolean; rewardAmount: number; rewardType: string }> => {
    try {
        // Use RPC function for atomic claim operation
        const { data, error } = await rpc.claimMailboxMessage(messageId, userId);

        if (error) throw error;

        console.log(`✅ Message ${messageId} claimed successfully. Rewarded ${data.rewardAmount} ${data.rewardType}`);

        return {
            success: true,
            rewardAmount: data.rewardAmount,
            rewardType: data.rewardType
        };
    } catch (error: any) {
        console.error('❌ Error claiming message:', error);
        throw error;
    }
};

/**
 * Mark a message as read
 */
export const markMessageAsRead = async (messageId: string): Promise<void> => {
    try {
        const { data: message } = await supabase
            .from('mailbox')
            .select('*')
            .eq('id', messageId)
            .single();

        if (message) {
            const updates: any = { status: MessageStatus.READ };

            // IF NOTICE/SYSTEM -> Expire in 10 minutes
            if (message.type === MessageType.NOTICE || message.type === MessageType.SYSTEM) {
                const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
                updates.expires_at = tenMinutesLater.toISOString();
            }

            const { error } = await supabase
                .from('mailbox')
                .update(updates)
                .eq('id', messageId);

            if (error) throw error;

            console.log(`✅ Message ${messageId} marked as read`);
        }
    } catch (error) {
        console.error('❌ Error marking message as read:', error);
    }
};

/**
 * Mark multiple messages as read (Batch)
 * - Autosets NOTICE expiry to 10 minutes from now
 */
export const markMessagesAsReadBatch = async (messageIds: string[]): Promise<void> => {
    if (messageIds.length === 0) return;

    try {
        // Fetch all messages to check their types
        const { data: messages } = await supabase
            .from('mailbox')
            .select('*')
            .in('id', messageIds);

        if (!messages) return;

        // Update each message with type-specific logic
        const updatePromises = messages.map(async (msg) => {
            const updates: any = { status: MessageStatus.READ };

            // IF NOTICE/SYSTEM -> Expire in 10 minutes
            if (msg.type === MessageType.NOTICE || msg.type === MessageType.SYSTEM) {
                const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
                updates.expires_at = tenMinutesLater.toISOString();
            }

            return supabase
                .from('mailbox')
                .update(updates)
                .eq('id', msg.id);
        });

        await Promise.all(updatePromises);
        console.log(`✅ Marked ${messageIds.length} messages as read with type-specific expiry.`);
    } catch (error) {
        console.error('❌ Error batch marking messages as read:', error);
    }
};

/**
 * Delete expired messages
 * Should be called periodically (e.g., on app load or via cloud function)
 */
export const deleteExpiredMessages = async (userId: string): Promise<number> => {
    try {
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('mailbox')
            .select('id')
            .eq('user_id', userId)
            .lt('expires_at', now);

        if (error) {
            console.error('❌ Error fetching expired messages:', error);
            return 0;
        }

        if (!data || data.length === 0) {
            return 0;
        }

        // Delete all expired messages
        const idsToDelete = data.map(msg => msg.id);
        const { error: deleteError } = await supabase
            .from('mailbox')
            .delete()
            .in('id', idsToDelete);

        if (deleteError) {
            console.error('❌ Error deleting expired messages:', deleteError);
            return 0;
        }

        console.log(`✅ Deleted ${idsToDelete.length} expired messages`);
        return idsToDelete.length;
    } catch (error) {
        console.error('❌ Error deleting expired messages:', error);
        return 0;
    }
};

/**
 * Get unread message count for a user
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
    try {
        const now = new Date().toISOString();

        const { count, error } = await supabase
            .from('mailbox')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', MessageStatus.UNREAD)
            .gt('expires_at', now);

        if (error) {
            console.error('❌ Error getting unread count:', error);
            return 0;
        }

        console.log(`✅ User ${userId} has ${count} unread messages`);
        return count || 0;
    } catch (error) {
        console.error('❌ Error getting unread count:', error);
        return 0;
    }
};

/**
 * Subscribe to unread message count (Real-time)
 */
export const subscribeToUnreadCount = (userId: string, callback: (count: number) => void): (() => void) => {
    try {
        const unsubscribe = realtime.subscribeToMailbox(userId, async () => {
            const count = await getUnreadCount(userId);
            callback(count);
        });

        // Initial fetch
        getUnreadCount(userId).then(callback);

        return unsubscribe;
    } catch (error) {
        console.error('❌ Error setting up unread count listener:', error);
        return () => { }; // Return empty unsubscribe if setup fails
    }
};

/**
 * Create a system notice message
 */
export const createNoticeMessage = async (
    userId: string,
    title: string,
    description: string,
    expiryDays: number = 7 // Default set to 7 days as per new requirement
): Promise<string> => {
    try {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

        const { data, error } = await supabase
            .from('mailbox')
            .insert({
                user_id: userId,
                type: MessageType.NOTICE,
                title,
                description,
                created_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
                status: MessageStatus.UNREAD,
                is_expired: false
            })
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Notice message created:', data.id);
        return data.id;
    } catch (error) {
        console.error('❌ Error creating notice message:', error);
        throw error;
    }
};

/**
 * Create a level up reward message
 */
export const createLevelUpRewardMessage = async (
    userId: string,
    level: number
): Promise<string> => {
    try {
        const { getLevelReward } = await import('../utils/levelUtils');
        const eTokensEarned = getLevelReward(level);

        if (eTokensEarned <= 0) return '';

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const { data, error } = await supabase
            .from('mailbox')
            .insert({
                user_id: userId,
                type: MessageType.LEVEL_REWARD,
                title: '🎉 Level Up Reward!',
                description: `Level ${level} Reward: ${eTokensEarned} E-Tokens`,
                created_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
                status: MessageStatus.UNREAD,
                reward_type: 'E_TOKEN',
                reward_amount: eTokensEarned,
                is_expired: false
            })
            .select()
            .single();

        if (error) throw error;

        console.log(`✅ Level ${level} reward message created for user ${userId}`);
        return data.id;
    } catch (error) {
        console.error('❌ Error creating level up reward message:', error);
        return '';
    }
};

/**
 * Create a referral reward message
 */
export const createReferralRewardMessage = async (
    userId: string,
    amount: number,
    reason: string
): Promise<string> => {
    try {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days expiry

        const { data, error } = await supabase
            .from('mailbox')
            .insert({
                user_id: userId,
                type: MessageType.REFERRAL_REWARD,
                title: '🎁 Referral Reward!',
                description: `${reason}: ${amount} E-Tokens`,
                created_at: now.toISOString(),
                expires_at: expiresAt.toISOString(),
                status: MessageStatus.UNREAD,
                reward_type: 'E_TOKEN',
                reward_amount: amount,
                is_expired: false
            })
            .select()
            .single();

        if (error) throw error;

        console.log(`✅ Referral reward message created for user ${userId}`);
        return data.id;
    } catch (error) {
        console.error('❌ Error creating referral reward message:', error);
        return '';
    }
};
