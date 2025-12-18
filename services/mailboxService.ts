import { db } from '../firebase';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    getDocs,
    getDoc,
    Timestamp,
    increment,
    onSnapshot
} from 'firebase/firestore';
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

        const message = {
            userId,
            type: MessageType.WEEKLY_REWARD,
            title: '🎁 Weekly Reward Available!',
            description: `Your ${sourceCoins.toLocaleString()} coins have been converted to ${eTokensEarned} E-Token${eTokensEarned > 1 ? 's' : ''}. Claim your reward within 7 days!`,
            createdAt: Timestamp.now(),
            expiresAt: Timestamp.fromDate(expiresAt),
            status: MessageStatus.UNREAD,
            rewardType: 'E_TOKEN' as const,
            rewardAmount: eTokensEarned,
            sourceCoins,
            isExpired: false
        };

        const docRef = await addDoc(collection(db, 'mailbox'), message);
        console.log('✅ Weekly reward message created:', docRef.id);
        return docRef.id;
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
        const now = Timestamp.now();

        // Query for user messages
        const q = query(
            collection(db, 'mailbox'),
            where('userId', '==', userId)
            // where('expiresAt', '>', now),
            // orderBy('expiresAt', 'asc'),
            // orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);

        const messages: MailboxMessage[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                userId: data.userId,
                type: data.type,
                title: data.title,
                description: data.description,
                createdAt: data.createdAt.toDate(),
                expiresAt: data.expiresAt.toDate(),
                status: data.status,
                rewardType: data.rewardType,
                rewardAmount: data.rewardAmount,
                sourceCoins: data.sourceCoins,
                isExpired: false,
                claimedAt: data.claimedAt?.toDate()
            };
        });

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
        // 1. Get message details
        const messageRef = doc(db, 'mailbox', messageId);
        const messageDoc = await getDoc(messageRef);

        if (!messageDoc.exists()) {
            throw new Error('Message not found');
        }

        const messageData = messageDoc.data();

        // 2. Verify ownership
        if (messageData.userId !== userId) {
            throw new Error('Unauthorized: Message does not belong to user');
        }

        // 3. Check if already claimed
        if (messageData.status === MessageStatus.CLAIMED) {
            throw new Error('Message already claimed');
        }

        // 4. Check if expired
        const now = new Date();
        const expiresAt = messageData.expiresAt.toDate();
        if (now > expiresAt) {
            throw new Error('Message has expired');
        }

        // 5. Update user's balance based on reward type
        const userRef = doc(db, 'users', userId);
        const rewardAmount = messageData.rewardAmount || 0;
        const rewardType = messageData.rewardType || 'E_TOKEN';

        if (rewardType === 'E_TOKEN') {
            await updateDoc(userRef, {
                eTokens: increment(rewardAmount)
            });
        } else if (rewardType === 'COINS') {
            await updateDoc(userRef, {
                coins: increment(rewardAmount)
            });
        } else if (rewardType === 'SPIN_TOKEN') {
            await updateDoc(userRef, {
                tokens: increment(rewardAmount)
            });
        }

        // 6. Mark message as claimed
        await updateDoc(messageRef, {
            status: MessageStatus.CLAIMED,
            claimedAt: Timestamp.now()
        });

        console.log(`✅ Message ${messageId} claimed successfully. Rewarded ${rewardAmount} ${rewardType}`);

        return {
            success: true,
            rewardAmount,
            rewardType
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
        const messageRef = doc(db, 'mailbox', messageId);
        const docSnap = await getDoc(messageRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const updates: any = { status: MessageStatus.READ };

            // IF NOTICE/SYSTEM -> Expire in 10 minutes
            if (data.type === MessageType.NOTICE || data.type === MessageType.SYSTEM) {
                const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
                updates.expiresAt = Timestamp.fromDate(tenMinutesLater);
            }

            await updateDoc(messageRef, updates);
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
        // We need to check message types to apply specific logic
        // But for efficiency in batch, we can't read all docs first if we don't have them passed.
        // However, usually this is called with IDs filtered by the UI effectively.

        // BETTER APPROACH: Just read them, it's safer functionality-wise, 
        // OR rely on the fact that this function is only called for a specific filtered list if we trust the caller.

        // Let's iterate and update individually to be safe and correct (Firestore limits batches to 500, we are fine)
        const updatePromises = messageIds.map(async (id) => {
            const docRef = doc(db, 'mailbox', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const updates: any = { status: MessageStatus.READ };

                // IF NOTICE/SYSTEM -> Expire in 10 minutes
                if (data.type === MessageType.NOTICE || data.type === MessageType.SYSTEM) {
                    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
                    updates.expiresAt = Timestamp.fromDate(tenMinutesLater);
                }

                await updateDoc(docRef, updates);
            }
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
        const now = Timestamp.now();

        const q = query(
            collection(db, 'mailbox'),
            where('userId', '==', userId),
            where('expiresAt', '<', now)
        );

        const snapshot = await getDocs(q);

        let deletedCount = 0;
        const deletePromises = snapshot.docs.map(async (docSnapshot) => {
            await deleteDoc(doc(db, 'mailbox', docSnapshot.id));
            deletedCount++;
        });

        await Promise.all(deletePromises);

        console.log(`✅ Deleted ${deletedCount} expired messages`);
        return deletedCount;
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
        const now = Timestamp.now();

        const q = query(
            collection(db, 'mailbox'),
            where('userId', '==', userId),
            where('status', '==', MessageStatus.UNREAD),
            where('expiresAt', '>', now)
        );

        const snapshot = await getDocs(q);
        const count = snapshot.size;

        console.log(`✅ User ${userId} has ${count} unread messages`);
        return count;
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
        const now = Timestamp.now();

        const q = query(
            collection(db, 'mailbox'),
            where('userId', '==', userId),
            where('status', '==', MessageStatus.UNREAD),
            where('expiresAt', '>', now)
        );

        // Real-time listener
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const count = snapshot.size;
            // console.log(`🔄 Real-time unread count for ${userId}: ${count}`);
            callback(count);
        }, (error) => {
            console.error('❌ Error in unread count listener:', error);
        });

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

        const message = {
            userId,
            type: MessageType.NOTICE,
            title,
            description,
            createdAt: Timestamp.now(),
            expiresAt: Timestamp.fromDate(expiresAt),
            status: MessageStatus.UNREAD,
            isExpired: false
        };

        const docRef = await addDoc(collection(db, 'mailbox'), message);
        console.log('✅ Notice message created:', docRef.id);
        return docRef.id;
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

        const message: any = {
            userId,
            type: MessageType.LEVEL_REWARD,
            title: '🎉 Level Up Reward!',
            description: `Level ${level} Reward: ${eTokensEarned} E-Tokens`,
            createdAt: Timestamp.now(),
            expiresAt: Timestamp.fromDate(expiresAt),
            status: MessageStatus.UNREAD,
            rewardType: 'E_TOKEN',
            rewardAmount: eTokensEarned,
            isExpired: false
        };

        const docRef = await addDoc(collection(db, 'mailbox'), message);
        console.log(`✅ Level ${level} reward message created for user ${userId}`);
        return docRef.id;
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

        const message = {
            userId,
            type: MessageType.REFERRAL_REWARD,
            title: '🎁 Referral Reward!',
            description: `${reason}: ${amount} E-Tokens`,
            createdAt: Timestamp.now(),
            expiresAt: Timestamp.fromDate(expiresAt),
            status: MessageStatus.UNREAD,
            rewardType: 'E_TOKEN',
            rewardAmount: amount,
            isExpired: false
        };

        const docRef = await addDoc(collection(db, 'mailbox'), message);
        console.log(`✅ Referral reward message created for user ${userId}`);
        return docRef.id;
    } catch (error) {
        console.error('❌ Error creating referral reward message:', error);
        return '';
    }
};




