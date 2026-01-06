import { doc, setDoc, getDoc, updateDoc, Timestamp, increment, runTransaction, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { createLevelUpRewardMessage } from './mailboxService';

// Generate the next numeric User ID using a transaction
// LEVEL-BASED RESERVED IDS SYSTEM v2.0
// Supports 5 progressive levels with gap-based release and automatic progression
export const getNextUserId = async (): Promise<number> => {
    const counterRef = doc(db, 'counters', 'userStats');
    const reservedRef = doc(db, 'system', 'reserved_bot_ids');
    const configRef = doc(db, 'system', 'reserved_ids_config');

    try {
        return await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            const reservedDoc = await transaction.get(reservedRef);
            const configDoc = await transaction.get(configRef);

            let lastId = 100000; // Default start ID
            if (counterDoc.exists()) {
                lastId = counterDoc.data().lastUserId;
            }

            // Get current Reserved IDs state
            let reservedIds: number[] = [];
            let currentLevel = 1;
            let levelPools: { [key: number]: number[] } = { 1: [], 2: [], 3: [], 4: [], 5: [] };

            if (reservedDoc.exists()) {
                const data = reservedDoc.data();
                reservedIds = data.ids || [];
                currentLevel = data.currentLevel || 1;
                levelPools = data.levelPools || { 1: [], 2: [], 3: [], 4: [], 5: [] };
            }

            // Get level configuration
            let levelConfig = {
                1: { maxIds: 6, gapSize: 2, filled: 0 },
                2: { maxIds: 10, gapSize: 5, filled: 0 },
                3: { maxIds: 20, gapSize: 10, filled: 0 },
                4: { maxIds: 50, gapSize: 20, filled: 0 },
                5: { maxIds: 100, gapSize: 50, filled: 0 }
            };

            if (configDoc.exists()) {
                const configData = configDoc.data();
                currentLevel = configData.currentLevel || currentLevel;
                levelConfig = configData.levels || levelConfig;
            }

            // Get current level settings
            const currentLevelConfig = levelConfig[currentLevel];
            const maxIdsForLevel = currentLevelConfig.maxIds;
            const gapSize = currentLevelConfig.gapSize;

            // Calculate current level pool size
            const currentLevelPoolSize = levelPools[currentLevel]?.length || 0;

            // DECISION: Should we reserve an ID?
            // Reserve if:
            // 1. Current level pool is not full
            // 2. We are at the correct gap interval
            const shouldReserve = currentLevelPoolSize < maxIdsForLevel &&
                (lastId % gapSize === 0 || lastId === 100000);

            let idToGiveUser = lastId + 1;
            let newLastId = lastId + 1;

            if (shouldReserve) {
                // Reserve logic:
                // User gets: lastId + 1
                // Bot gets: lastId + 2 (Reserved)
                // New lastId: lastId + 2
                idToGiveUser = lastId + 1;
                const idToReserve = lastId + 2;
                newLastId = lastId + 2;

                // Add to global pool and current level pool
                reservedIds.push(idToReserve);
                levelPools[currentLevel].push(idToReserve);

                // Update config filled count
                levelConfig[currentLevel].filled = levelPools[currentLevel].length;

                // Check if current level is now full → Progress to next level
                if (levelPools[currentLevel].length >= maxIdsForLevel && currentLevel < 5) {
                    console.log(`🎉 Level ${currentLevel} FULL! Unlocking Level ${currentLevel + 1}`);
                    currentLevel++;

                    // Update config with new level
                    transaction.set(configRef, {
                        currentLevel: currentLevel,
                        levels: levelConfig,
                        lastUpdated: Timestamp.now()
                    }, { merge: true });
                }

                // Update reserved list
                transaction.set(reservedRef, {
                    ids: reservedIds,
                    currentLevel: currentLevel,
                    levelPools: levelPools,
                    lastUpdated: Timestamp.now()
                }, { merge: true });

                console.log(`🔒 Reserved Bot ID: ${idToReserve} for Level ${currentLevel}. Pool Size: ${levelPools[currentLevel].length}/${maxIdsForLevel}`);
            }

            // Update Counter
            transaction.set(counterRef, { lastUserId: newLastId }, { merge: true });

            return idToGiveUser;
        });
    } catch (error) {
        console.error("Error generating User ID:", error);
        throw error;
    }
};

// Check if username is already taken
// Check if username is already taken (Checks both Exact and Case-Insensitive)
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    try {
        const usersRef = collection(db, 'users');
        const usernameLower = username.toLowerCase();

        // 1. Check Exact Match (For old users who might not have usernameLower)
        const qExact = query(usersRef, where('username', '==', username));

        // 2. Check Case Insensitive Match (For new/migrated users)
        const qLower = query(usersRef, where('usernameLower', '==', usernameLower));

        // Run both checks in parallel
        const [exactSnapshot, lowerSnapshot] = await Promise.all([
            getDocs(qExact),
            getDocs(qLower)
        ]);

        // If EITHER query returns a document, the username is taken
        // (i.e. if exact match found OR lower-case match found)
        return exactSnapshot.empty && lowerSnapshot.empty;
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
                usernameLower: (user.username || 'Player').toLowerCase(), // Save lowercase for uniqueness checks
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

            // Send Level 1 Reward Mail (10 E-Tokens)
            await createLevelUpRewardMessage(user.uid, 1);

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
