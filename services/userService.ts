import { doc, setDoc, getDoc, updateDoc, Timestamp, increment, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';

// Generate the next numeric User ID using a transaction
export const getNextUserId = async (): Promise<number> => {
    const counterRef = doc(db, 'counters', 'userStats');

    try {
        return await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);

            let newId = 100000; // Default start ID

            if (counterDoc.exists()) {
                const currentId = counterDoc.data().lastUserId;
                newId = currentId + 1;
            }

            transaction.set(counterRef, { lastUserId: newId }, { merge: true });
            return newId;
        });
    } catch (error) {
        console.error("Error generating User ID:", error);
        throw error;
    }
};

// Helper to generate a simple referral code
const generateReferralCode = (displayId: number): string => {
    // Simple strategy: HEX + displayId (e.g., HEX100001)
    // This ensures uniqueness since displayId is unique.
    return `HEX${displayId}`;
};

// Create user profile in Firestore
export const createUserProfile = async (user: User): Promise<{ displayId: number, referralCode: string } | void> => {
    try {
        if (!user.uid) {
            throw new Error('User UID is required');
        }

        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            // Generate a numeric ID for the new user
            const displayId = await getNextUserId();
            const referralCode = generateReferralCode(displayId);

            await setDoc(userRef, {
                uid: user.uid,
                email: user.email || '',
                username: user.username || 'Player',
                isGuest: user.isGuest,
                eTokens: user.eTokens || 0,
                weeklyCoins: 0,
                photoURL: user.photoURL || null,
                displayId: displayId, // Save the numeric ID
                referralCode: referralCode, // Save the generated referral code
                referralCount: 0,
                createdAt: Timestamp.now(),
                lastActive: Timestamp.now(),
                weekStartDate: Timestamp.now(),
                spinsToday: 0,
                lastSpinDate: Timestamp.now(),
                superModeEndTime: null
            });

            return { displayId, referralCode };
        } else {
            // User already exists, return existing data
            const data = userDoc.data();
            return {
                displayId: data.displayId,
                referralCode: data.referralCode
            };
        }
    } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
};

// Get user profile from Firestore
export const getUserProfile = async (uid: string): Promise<User | null> => {
    try {
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const data = userDoc.data();
            return {
                id: userDoc.id,
                uid: data.uid,
                email: data.email,
                username: data.username,
                isGuest: data.isGuest,
                eTokens: data.eTokens,
                weeklyCoins: data.weeklyCoins,
                photoURL: data.photoURL,
                displayId: data.displayId,
                referralCode: data.referralCode,
                referralCount: data.referralCount,
                referredBy: data.referredBy,
                referralDismissed: data.referralDismissed,
                createdAt: data.createdAt?.toDate(),
                lastActive: data.lastActive?.toDate(),
                weekStartDate: data.weekStartDate?.toDate(),
                spinsToday: data.spinsToday || 0,
                lastSpinDate: data.lastSpinDate?.toDate(),
                superModeEndTime: data.superModeEndTime?.toDate()
            };
        }

        return null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
};

// Update user's weekly coins
export const updateUserCoins = async (uid: string, coinsToAdd: number): Promise<void> => {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            weeklyCoins: increment(coinsToAdd),
            lastActive: Timestamp.now()
        });
    } catch (error) {
        console.error('Error updating user coins:', error);
        throw error;
    }
};

// Update user activity timestamp
export const updateUserActivity = async (uid: string): Promise<void> => {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            lastActive: Timestamp.now()
        });
    } catch (error) {
        console.error('Error updating user activity:', error);
    }
};

// Update user's e-tokens
export const updateUserETokens = async (uid: string, tokensToAdd: number): Promise<void> => {
    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            eTokens: increment(tokensToAdd),
            lastActive: Timestamp.now()
        });
    } catch (error) {
        console.error('Error updating user e-tokens:', error);
        throw error;
    }
};

// Ensure user has a numeric display ID and Referral Code (Backfill for existing users)
export const ensureUserHasDisplayId = async (user: User): Promise<User> => {
    let updates: any = {};
    let updatedUser = { ...user };
    let needsUpdate = false;

    // 1. Check for Display ID
    if (!user.displayId) {
        console.log(`User ${user.uid} missing displayId, generating one...`);
        try {
            const newId = await getNextUserId();
            updates.displayId = newId;
            updatedUser.displayId = newId;
            needsUpdate = true;
        } catch (error) {
            console.error("Error generating display ID:", error);
        }
    }

    // 2. Check for Referral Code
    // We need a displayId to generate a referral code (using our strategy HEX + ID)
    if (!user.referralCode && updatedUser.displayId) {
        console.log(`User ${user.uid} missing referralCode, generating one...`);
        const newCode = generateReferralCode(updatedUser.displayId);
        updates.referralCode = newCode;
        updatedUser.referralCode = newCode;
        needsUpdate = true;
    }

    if (needsUpdate) {
        try {
            const userRef = doc(db, 'users', user.uid!);
            await updateDoc(userRef, updates);
            console.log(`✅ Backfilled missing data for user ${user.uid}:`, updates);
            return updatedUser;
        } catch (error) {
            console.error("Error updating user profile with backfilled data:", error);
            return user;
        }
    }

    return user;
};
