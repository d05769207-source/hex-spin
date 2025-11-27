import { doc, setDoc, getDoc, updateDoc, Timestamp, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';

// Create user profile in Firestore
export const createUserProfile = async (user: User): Promise<void> => {
    try {
        if (!user.uid) {
            throw new Error('User UID is required');
        }

        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email || '',
                username: user.username || 'Player',
                isGuest: user.isGuest,
                eTokens: user.eTokens || 0,
                weeklyCoins: 0,
                photoURL: user.photoURL || null,
                createdAt: Timestamp.now(),
                lastActive: Timestamp.now(),
                weekStartDate: Timestamp.now()
            });
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
                createdAt: data.createdAt?.toDate(),
                lastActive: data.lastActive?.toDate(),
                weekStartDate: data.weekStartDate?.toDate()
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
