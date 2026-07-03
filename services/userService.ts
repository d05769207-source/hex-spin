import { supabase, rpc } from '../supabaseClient';
import { User } from '../types';
import { createLevelUpRewardMessage } from './mailboxService';

// Generate the next numeric User ID using Supabase RPC function
// LEVEL-BASED RESERVED IDS SYSTEM v2.0
// Supports 5 progressive levels with gap-based release and automatic progression
export const getNextUserId = async (): Promise<number> => {
    try {
        const { data, error } = await rpc.getNextUserId();

        if (error) {
            console.error("Error generating User ID:", error);
            throw error;
        }

        return data || 100001;
    } catch (error) {
        console.error("Error generating User ID:", error);
        throw error;
    }
};

// Check if username is already taken (Checks both Exact and Case-Insensitive)
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
        const usernameLower = username.toLowerCase();

        // Check both exact and case-insensitive match
        const { data, error } = await supabase
            .from('users')
            .select('uid')
            .or(`username.eq.${username},username_lower.eq.${usernameLower}`)
            .limit(1);

        if (error) {
            console.error("Error checking username availability:", error);
            return false; // Assume taken on error to be safe
        }

        // If no data found, username is available
        return !data || data.length === 0;
    } catch (error) {
        console.error("Error checking username availability:", error);
        return false; // Assume taken on error to be safe
    }
};

// Helper to generate a simple referral code
const generateReferralCode = (displayId: number): string => {
    // Simple strategy: HEX + displayId (e.g., HEX100001)
    // This ensures uniqueness since displayId is unique.
    return `HEX${displayId}`;
};

// Create user profile in Supabase
export const createUserProfile = async (user: User): Promise<{ displayId: number, referralCode: string } | void> => {
    try {
        if (!user.uid) {
            throw new Error('User UID is required');
        }

        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('uid', user.uid)
            .single();

        if (!existingUser) {
            // Generate a numeric ID for the new user (with retry logic for collisions)
            let displayId: number | undefined;
            let referralCode: string | undefined;
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                try {
                    attempts++;
                    // 1. Get Next ID
                    displayId = await getNextUserId();
                    referralCode = generateReferralCode(displayId);

                    // 2. Try to Insert
                    const { error } = await supabase
                        .from('users')
                        .insert({
                            uid: user.uid,
                            email: user.email || '',
                            username: user.username || 'Player',
                            username_lower: (user.username || 'Player').toLowerCase(),
                            is_guest: user.isGuest,
                            e_tokens: user.eTokens || 0,
                            coins: 0,
                            ktm_tokens: 0,
                            iphone_tokens: 0,
                            inr_balance: 0,
                            tokens: user.tokens || 10,
                            total_spins: 0,
                            photo_url: user.photoURL || null,
                            display_id: displayId,
                            referral_code: referralCode,
                            referral_count: 0,
                            referral_earnings: 0,
                            created_at: new Date().toISOString(),
                            last_active: new Date().toISOString(),
                            week_start_date: new Date().toISOString(),
                            spins_today: 0,
                            last_spin_date: new Date().toISOString(),
                            super_mode_end_time: null,
                            super_mode_spins_left: 0,
                            level: 1
                        });

                    if (error) {
                        // Check for unique constraint violation on display_id (23505)
                        if (error.code === '23505' && error.message?.includes('users_display_id_key')) {
                            console.warn(`⚠️ Collision detected for Display ID ${displayId}. Retrying... (${attempts}/${maxAttempts})`);
                            continue; // Retry loop
                        }
                        throw error; // Throw other errors
                    }

                    // Success! Break loop
                    break;

                } catch (err: any) {
                    if (attempts >= maxAttempts) {
                        console.error('❌ Failed to create user profile after max retries:', err);
                        throw err;
                    }
                    // If it's not a collision error, throw immediately
                    if (err.code !== '23505') throw err;
                }
            }

            if (!displayId || !referralCode) {
                throw new Error("Failed to generate unique Display ID.");
            }

            // Send Level 1 Reward Mail (10 E-Tokens)
            await createLevelUpRewardMessage(user.uid, 1);

            return { displayId, referralCode };
        } else {
            // User already exists, return existing data
            return {
                displayId: existingUser.display_id,
                referralCode: existingUser.referral_code
            };
        }
    } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
};

// Get user profile from Supabase
export const getUserProfile = async (uid: string): Promise<User | null> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('uid', uid)
            .single();

        if (error || !data) {
            return null;
        }

        return {
            id: data.id,
            uid: data.uid,
            email: data.email,
            username: data.username,
            isGuest: data.is_guest,
            eTokens: data.e_tokens,
            weeklyCoins: 0, // This field is deprecated, using coins instead
            photoURL: data.photo_url,
            displayId: data.display_id,
            referralCode: data.referral_code,
            referralCount: data.referral_count,
            referredBy: data.referred_by,
            referralDismissed: data.referral_dismissed,
            createdAt: data.created_at ? new Date(data.created_at) : undefined,
            lastActive: data.last_active ? new Date(data.last_active) : undefined,
            weekStartDate: data.week_start_date ? new Date(data.week_start_date) : undefined,
            spinsToday: data.spins_today || 0,
            lastSpinDate: data.last_spin_date ? new Date(data.last_spin_date) : undefined,
            superModeEndTime: data.super_mode_end_time ? new Date(data.super_mode_end_time) : undefined,
            coins: data.coins || 0,
            ktmTokens: data.ktm_tokens || 0,
            iphoneTokens: data.iphone_tokens || 0,
            inrBalance: data.inr_balance || 0,
            tokens: data.tokens || 10,
            totalSpins: data.total_spins || 0,
            level: data.level || 1,
            superModeSpinsLeft: data.super_mode_spins_left || 0,
            lastWeekId: data.last_week_id
        };
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
};

// Update user's coins
export const updateUserCoins = async (uid: string, coinsToAdd: number): Promise<void> => {
    try {
        const { error } = await rpc.incrementUserCoins(uid, coinsToAdd);

        if (error) {
            console.error('Error updating user coins:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error updating user coins:', error);
        throw error;
    }
};

// Update user activity timestamp
export const updateUserActivity = async (uid: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('users')
            .update({ last_active: new Date().toISOString() })
            .eq('uid', uid);

        if (error) {
            console.error('Error updating user activity:', error);
        }
    } catch (error) {
        console.error('Error updating user activity:', error);
    }
};

// Update user's e-tokens
export const updateUserETokens = async (uid: string, tokensToAdd: number): Promise<void> => {
    try {
        const { error } = await rpc.incrementUserETokens(uid, tokensToAdd);

        if (error) {
            console.error('Error updating user e-tokens:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error updating user e-tokens:', error);
        throw error;
    }
};

// Update user's KTM tokens
export const updateUserKtmTokens = async (uid: string, tokensToAdd: number): Promise<void> => {
    try {
        const { error } = await rpc.incrementUserKtmTokens(uid, tokensToAdd);

        if (error) {
            console.error('Error updating user KTM tokens:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error updating user KTM tokens:', error);
        throw error;
    }
};

// Update user's iPhone tokens
export const updateUserIphoneTokens = async (uid: string, tokensToAdd: number): Promise<void> => {
    try {
        const { error } = await rpc.incrementUserIphoneTokens(uid, tokensToAdd);

        if (error) {
            console.error('Error updating user iPhone tokens:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error updating user iPhone tokens:', error);
        throw error;
    }
};

// Update user's total spins
export const updateUserTotalSpins = async (uid: string, spinsToAdd: number): Promise<void> => {
    try {
        const { error } = await rpc.incrementUserTotalSpins(uid, spinsToAdd);

        if (error) {
            console.error('Error updating user total spins:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error updating user total spins:', error);
        throw error;
    }
};

// Update user's spins today
export const updateUserSpinsToday = async (uid: string, spinsToAdd: number): Promise<void> => {
    try {
        const { error } = await rpc.incrementUserSpinsToday(uid, spinsToAdd);

        if (error) {
            console.error('Error updating user spins today:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error updating user spins today:', error);
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
            updates.display_id = newId;
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
        updates.referral_code = newCode;
        updatedUser.referralCode = newCode;
        needsUpdate = true;
    }

    if (needsUpdate) {
        try {
            const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('uid', user.uid!);

            if (error) {
                console.error("Error updating user profile with backfilled data:", error);
                return user;
            }

            console.log(`✅ Backfilled missing data for user ${user.uid}:`, updates);
            return updatedUser;
        } catch (error) {
            console.error("Error updating user profile with backfilled data:", error);
            return user;
        }
    }

    return user;
};
