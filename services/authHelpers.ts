import { supabase } from '../supabaseClient';
import { User } from '../types';
import { createUserProfile } from './userService';

/**
 * Fetch user data from Supabase with retry logic
 * Implements exponential backoff for network failures
 *
 * @param uid - User's Supabase UID
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
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('uid', uid)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows returned - user doesn't exist
                    console.log(`⚠️ User document does not exist (attempt ${attempt + 1})`);
                    return null;
                }
                throw error;
            }

            if (data) {
                console.log(`✅ User data found on attempt ${attempt + 1}`);
                return data;
            } else {
                console.log(`⚠️ User document does not exist (attempt ${attempt + 1})`);
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
 * Recreate user profile from Supabase Auth data
 * Used when Supabase data is missing but Auth profile exists (cache clear scenario)
 *
 * @param supabaseUser - Supabase Auth user object
 * @returns Created user profile data
 */
export async function recreateUserProfile(supabaseUser: any): Promise<any> {
    console.log('🔧 Recreating user profile from Supabase Auth data...');
    console.log('Auth User:', {
        uid: supabaseUser.id,
        displayName: supabaseUser.user_metadata?.username || supabaseUser.user_metadata?.full_name,
        email: supabaseUser.email
    });

    try {
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('uid', supabaseUser.id)
            .single();

        if (existingUser) {
            console.log('✅ User profile already exists in Supabase');
            return existingUser;
        }

        // Profile is missing - create new one from Auth data
        console.log('⚠️ Profile missing in Supabase, creating new profile...');

        const userData = supabaseUser.user_metadata || {};
        const username = userData.username || userData.full_name || supabaseUser.email?.split('@')[0] || 'Player';

        const newUser: User = {
            id: supabaseUser.id,
            uid: supabaseUser.id,
            username: username,
            email: supabaseUser.email || undefined,
            isGuest: false,
            photoURL: userData.avatar_url || userData.picture || undefined,
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
        const { data: newUserDoc } = await supabase
            .from('users')
            .select('*')
            .eq('uid', supabaseUser.id)
            .single();

        if (newUserDoc) {
            return newUserDoc;
        }

        return null;
    } catch (error) {
        console.error('❌ Error recreating user profile:', error);
        throw error;
    }
}

/**
 * Check if user exists in Supabase
 * Simple helper to check user existence without fetching full data
 *
 * @param uid - User's Supabase UID
 * @returns true if user exists, false otherwise
 */
export async function checkUserExists(uid: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('uid')
            .eq('uid', uid)
            .single();

        return !error && !!data;
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
