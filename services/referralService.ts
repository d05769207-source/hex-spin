import { supabase } from '../supabaseClient';
import { User, MessageType, MessageStatus } from '../types';

/**
 * Validates a referral code.
 * Returns the referrer's UID if valid, or null if invalid.
 */
export const validateReferralCode = async (code: string, currentUserId: string): Promise<string | null> => {
    if (!code || code.length < 6) return null;

    try {
        // 1. Check if the code belongs to a user
        const { data, error } = await supabase
            .from('users')
            .select('uid')
            .eq('referral_code', code)
            .single();

        if (error || !data) {
            // Fallback: Check if code is a UID substring (legacy support or simple ID match)
            // For now, we strictly enforce the stored referralCode. 
            // If you want to support UID matching, you'd need a different query or client-side check if not indexed.
            return null;
        }

        const referrerId = data.uid;

        // 2. Prevent self-referral
        if (referrerId === currentUserId) {
            console.warn('Cannot refer yourself');
            return null;
        }

        return referrerId;
    } catch (error) {
        console.error('Error validating referral code:', error);
        return null;
    }
};



/**
 * Applies a referral code to the current user.
 * Awards 5 tokens to the referrer immediately.
 */
export const applyReferral = async (currentUserId: string, referrerId: string): Promise<{ success: boolean; message: string }> => {
    try {
        // Use a transaction-like approach with RPC or sequential updates
        // For simplicity, we'll do sequential updates with error handling

        // 1. Get current user data
        const { data: currentUserData, error: currentUserError } = await supabase
            .from('users')
            .select('*')
            .eq('uid', currentUserId)
            .single();

        if (currentUserError || !currentUserData) {
            throw new Error('Current user does not exist');
        }

        // 2. Get referrer data
        const { data: referrerData, error: referrerError } = await supabase
            .from('users')
            .select('*')
            .eq('uid', referrerId)
            .single();

        if (referrerError || !referrerData) {
            throw new Error('Referrer does not exist');
        }

        // 3. Check if already referred
        if (currentUserData.referred_by) {
            throw new Error('User already referred');
        }

        // 4. Update Current User
        const { error: updateCurrentUserError } = await supabase
            .from('users')
            .update({
                referred_by: referrerId,
                referral_dismissed: true, // Dismiss the prompt since they successfully used a code
                last_level_reward_triggered: currentUserData.level || 1 // Start tracking from current level
            })
            .eq('uid', currentUserId);

        if (updateCurrentUserError) throw updateCurrentUserError;

        // 5. Update Referrer (Add 50 eTokens via Mailbox + Increment Count/Earnings)
        // Note: We do NOT increment 'e_tokens' directly anymore. User must claim from Mailbox.
        // We DO increment 'referral_earnings' to track lifetime stats.

        const { error: updateReferrerError } = await supabase
            .from('users')
            .update({
                referral_count: (referrerData.referral_count || 0) + 1,
                referral_earnings: (referrerData.referral_earnings || 0) + 50
            })
            .eq('uid', referrerId);

        if (updateReferrerError) throw updateReferrerError;

        // 6. Send Mailbox Message (Direct Implementation to avoid import issues)
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

            const { error: mailboxError } = await supabase
                .from('mailbox')
                .insert({
                    user_id: referrerId,
                    type: MessageType.REFERRAL_REWARD,
                    title: '🎁 Referral Reward!',
                    description: `New Referral Bonus: 50 E-Tokens`,
                    created_at: now.toISOString(),
                    expires_at: expiresAt.toISOString(),
                    status: MessageStatus.UNREAD,
                    reward_type: 'E_TOKEN',
                    reward_amount: 50,
                    is_expired: false
                });

            if (mailboxError) throw mailboxError;

            console.log(`✅ Direct Mailbox Write Success for ${referrerId}`);
        } catch (msgError) {
            console.error('❌ Direct Mailbox Write Failed:', msgError);
        }

        return { success: true, message: 'Referral applied successfully!' };
    } catch (error: any) {
        console.error('Error applying referral:', error);
        return { success: false, message: error.message || 'Failed to apply referral' };
    }
};

/**
 * Permanently dismisses the referral prompt for the user.
 */
export const dismissReferralPrompt = async (currentUserId: string): Promise<void> => {
    try {
        console.log('Attempting to dismiss referral prompt for:', currentUserId);
        const { error } = await supabase
            .from('users')
            .update({
                referral_dismissed: true
            })
            .eq('uid', currentUserId);

        if (error) throw error;

        console.log('Successfully dismissed referral prompt for:', currentUserId);
    } catch (error) {
        console.error('Error dismissing referral prompt:', error);
    }
};

/**
 * Checks and awards level-up rewards to the referrer.
 * Should be called whenever the user levels up.
 */
export const processLevelUpReward = async (currentUserId: string, currentLevel: number): Promise<void> => {
    try {
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('uid', currentUserId)
            .single();

        if (userError || !userData) return;

        const referrerId = userData.referred_by;
        const lastTriggered = userData.last_level_reward_triggered || 0;

        // If no referrer or no new levels gained since last reward, exit
        if (!referrerId || currentLevel <= lastTriggered) return;

        const levelsGained = currentLevel - lastTriggered;

        // Cap at Level 100 (Optional, based on requirements "up to Level 100")
        // If currentLevel > 100, we might still award for the levels up to 100 if not yet awarded.
        // For simplicity, we assume generic "1 token per level".

        if (levelsGained <= 0) {
            return;
        }

        // 1. Award 20 eTokens per level to Referrer (Via Mailbox)
        // Only update earnings tracker here
        const { data: referrerData, error: referrerError } = await supabase
            .from('users')
            .select('referral_earnings')
            .eq('uid', referrerId)
            .single();

        if (referrerError || !referrerData) return;

        const { error: updateReferrerError } = await supabase
            .from('users')
            .update({
                referral_earnings: (referrerData.referral_earnings || 0) + (levelsGained * 20)
            })
            .eq('uid', referrerId);

        if (updateReferrerError) throw updateReferrerError;

        // 2. Update Current User's tracker
        const { error: updateUserError } = await supabase
            .from('users')
            .update({
                last_level_reward_triggered: currentLevel
            })
            .eq('uid', currentUserId);

        if (updateUserError) throw updateUserError;

        // 3. Send Mailbox Message (Direct Implementation)
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            const { error: mailboxError } = await supabase
                .from('mailbox')
                .insert({
                    user_id: referrerId,
                    type: MessageType.REFERRAL_REWARD,
                    title: '🎁 Referral Reward!',
                    description: `Friend Level Up Bonus (${levelsGained} levels): ${levelsGained * 20} E-Tokens`,
                    created_at: now.toISOString(),
                    expires_at: expiresAt.toISOString(),
                    status: MessageStatus.UNREAD,
                    reward_type: 'E_TOKEN',
                    reward_amount: levelsGained * 20,
                    is_expired: false
                });

            if (mailboxError) throw mailboxError;

            console.log(`✅ Direct Mailbox Write Success for LevelUp: ${referrerId}`);
        } catch (msgError) {
            console.error('❌ Direct Mailbox Write LevelUp Failed:', msgError);
        }

        console.log(`Awarded ${levelsGained} levels worth of tokens to referrer ${referrerId}`);

    } catch (error) {
        console.error('Error processing level up reward:', error);
    }
};
