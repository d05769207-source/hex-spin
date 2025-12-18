import { db } from '../firebase';
import { doc, getDoc, updateDoc, runTransaction, increment, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { User, MessageType, MessageStatus } from '../types';

/**
 * Validates a referral code.
 * Returns the referrer's UID if valid, or null if invalid.
 */
export const validateReferralCode = async (code: string, currentUserId: string): Promise<string | null> => {
    if (!code || code.length < 6) return null;

    try {
        // 1. Check if the code belongs to a user
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('referralCode', '==', code));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // Fallback: Check if code is a UID substring (legacy support or simple ID match)
            // For now, we strictly enforce the stored referralCode. 
            // If you want to support UID matching, you'd need a different query or client-side check if not indexed.
            return null;
        }

        const referrerDoc = querySnapshot.docs[0];
        const referrerId = referrerDoc.id;

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
    console.log(`[DEBUG] applyReferral called: user=${currentUserId}, referrer=${referrerId}`);
    try {
        await runTransaction(db, async (transaction) => {
            const currentUserRef = doc(db, 'users', currentUserId);
            const referrerRef = doc(db, 'users', referrerId);

            const currentUserDoc = await transaction.get(currentUserRef);
            const referrerDoc = await transaction.get(referrerRef);

            if (!currentUserDoc.exists()) {
                throw new Error('Current user does not exist');
            }
            if (!referrerDoc.exists()) {
                throw new Error('Referrer does not exist');
            }

            const currentUserData = currentUserDoc.data() as User;

            // Double check if already referred
            if (currentUserData.referredBy) {
                throw new Error('User already referred');
            }

            // 1. Update Current User
            transaction.update(currentUserRef, {
                referredBy: referrerId,
                referralDismissed: true, // Dismiss the prompt since they successfully used a code
                lastLevelRewardTriggered: currentUserData.level || 1 // Start tracking from current level
            });

            // 2. Update Referrer (Add 50 eTokens via Mailbox + Increment Count/Earnings)
            // Note: We do NOT increment 'eTokens' directly anymore. User must claim from Mailbox.
            // We DO increment 'referralEarnings' to track lifetime stats.

            transaction.update(referrerRef, {
                referralCount: increment(1),
                referralEarnings: increment(50)
            });
        });

        // Send Mailbox Message (Direct Implementation to avoid import issues)
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await addDoc(collection(db, 'mailbox'), {
                userId: referrerId,
                type: MessageType.REFERRAL_REWARD,
                title: '🎁 Referral Reward!',
                description: `New Referral Bonus: 50 E-Tokens`,
                createdAt: new Date(),
                expiresAt: expiresAt,
                status: MessageStatus.UNREAD,
                rewardType: 'E_TOKEN',
                rewardAmount: 50,
                isExpired: false
            });
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
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
            referralDismissed: true
        });
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
        const userRef = doc(db, 'users', currentUserId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) return;

        const userData = userSnap.data() as User;
        const referrerId = userData.referredBy;
        const lastTriggered = userData.lastLevelRewardTriggered || 0;

        // If no referrer or no new levels gained since last reward, exit
        if (!referrerId || currentLevel <= lastTriggered) return;

        const levelsGained = currentLevel - lastTriggered;

        // Cap at Level 100 (Optional, based on requirements "up to Level 100")
        // If currentLevel > 100, we might still award for the levels up to 100 if not yet awarded.
        // For simplicity, we assume generic "1 token per level".

        if (levelsGained <= 0) {
            console.log(`[DEBUG] levelsGained <= 0 (${levelsGained}), skipping reward.`);
            return;
        }

        console.log(`[DEBUG] Processing level up reward: levelsGained=${levelsGained}, referrer=${referrerId}`);

        await runTransaction(db, async (transaction) => {
            const referrerRef = doc(db, 'users', referrerId);

            // 1. Award 20 eTokens per level to Referrer (Via Mailbox)
            // Only update earnings tracker here
            transaction.update(referrerRef, {
                referralEarnings: increment(levelsGained * 20)
            });

            // 2. Update Current User's tracker
            transaction.update(userRef, {
                lastLevelRewardTriggered: currentLevel
            });
        });

        // Send Mailbox Message (Direct Implementation)
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            await addDoc(collection(db, 'mailbox'), {
                userId: referrerId,
                type: MessageType.REFERRAL_REWARD,
                title: '🎁 Referral Reward!',
                description: `Friend Level Up Bonus (${levelsGained} levels): ${levelsGained * 20} E-Tokens`,
                createdAt: new Date(),
                expiresAt: expiresAt,
                status: MessageStatus.UNREAD,
                rewardType: 'E_TOKEN',
                rewardAmount: levelsGained * 20,
                isExpired: false
            });
            console.log(`✅ Direct Mailbox Write Success for LevelUp: ${referrerId}`);
        } catch (msgError) {
            console.error('❌ Direct Mailbox Write LevelUp Failed:', msgError);
        }

        console.log(`Awarded ${levelsGained} levels worth of tokens to referrer ${referrerId}`);

    } catch (error) {
        console.error('Error processing level up reward:', error);
    }
};
