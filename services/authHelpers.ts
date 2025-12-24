import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { createUserProfile } from './userService';

/**
 * Fetch user data from Firestore with retry logic
 * Implements exponential backoff for network failures
 * 
 * @param uid - User's Firebase UID
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns User data if found, null if not found
 * @throws Error if all retries fail
 */
export async function fetchUserWithRetry(
    uid: string,
    maxRetries: number = 3
): Promise<any | null> {
    console.log(`🔍 Fetching user data for UID: ${uid} (max retries: ${maxRetries})`);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const userDocRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                console.log(`✅ User data found on attempt ${attempt + 1}`);
                return userDoc.data();
            } else {
                console.log(`⚠️ User document does not exist (attempt ${attempt + 1})`);
                // Document doesn't exist - no need to retry
                return null;
            }
        } catch (error) {
            console.error(`❌ Fetch attempt ${attempt + 1} failed:`, error);

            // If this was the last attempt, throw the error
            if (attempt === maxRetries - 1) {
                console.error('🚨 All retry attempts exhausted');
                throw error;
            }

            // Wait before retrying (exponential backoff: 1s, 2s, 4s)
            const waitTime = 1000 * Math.pow(2, attempt);
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    return null;
}

/**
 * Recreate user profile from Firebase Auth data
 * Used when Firestore data is missing but Auth profile exists (cache clear scenario)
 * 
 * @param firebaseUser - Firebase Auth user object
 * @returns Created user profile data
 */
export async function recreateUserProfile(firebaseUser: any): Promise<any> {
    console.log('🔧 Recreating user profile from Firebase Auth data...');
    console.log('Auth User:', {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName,
        email: firebaseUser.email
    });

    try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            console.log('✅ User profile already exists in Firestore');
            return userDoc.data();
        }

        // Profile is missing - create new one from Auth data
        console.log('⚠️ Profile missing in Firestore, creating new profile...');

        const newUser: User = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            username: firebaseUser.displayName || 'Player',
            email: firebaseUser.email || undefined,
            isGuest: false,
            photoURL: firebaseUser.photoURL || undefined,
            tokens: 10, // Welcome bonus
            coins: 0,
            eTokens: 0,
            ktmTokens: 0,
            iphoneTokens: 0,
            inrBalance: 0,
            totalSpins: 0
        };

        // Create profile using existing service
        const result = await createUserProfile(newUser);

        console.log('✅ Profile recreated successfully:', result);

        // Fetch the newly created profile
        const newUserDoc = await getDoc(userRef);
        if (newUserDoc.exists()) {
            return newUserDoc.data();
        }

        return null;
    } catch (error) {
        console.error('❌ Error recreating user profile:', error);
        throw error;
    }
}

/**
 * Check if user exists in Firestore
 * Simple helper to check user existence without fetching full data
 * 
 * @param uid - User's Firebase UID
 * @returns true if user exists, false otherwise
 */
export async function checkUserExists(uid: string): Promise<boolean> {
    try {
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);
        return userDoc.exists();
    } catch (error) {
        console.error('Error checking user existence:', error);
        return false;
    }
}

/**
 * Clear all browser storage
 * Used during logout to ensure complete session cleanup
 */
export function clearAllStorage(): void {
    console.log('🧹 Clearing all browser storage...');

    try {
        // Clear session storage
        sessionStorage.clear();
        console.log('✅ Session storage cleared');

        // Clear local storage
        localStorage.clear();
        console.log('✅ Local storage cleared');

        // Clear cookies (optional, but thorough)
        document.cookie.split(";").forEach((c) => {
            document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        console.log('✅ Cookies cleared');

        console.log('✅ All storage cleared successfully');
    } catch (error) {
        console.error('❌ Error clearing storage:', error);
    }
}
