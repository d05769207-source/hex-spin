import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs, Timestamp, writeBatch, orderBy, limit, increment, deleteDoc } from 'firebase/firestore';
import { BotUser, User, BotTier } from '../types';
import { getCurrentWeekId, getTimeRemaining, getCurrentTime } from '../utils/weekUtils';

// CONSTANTS
const TOTAL_BOTS = 3;
const BOT_COLLECTION = 'botUsers';
const USER_COLLECTION = 'users';
const LOCK_COLLECTION = 'system';
const LOCK_DOC_ID = 'botLock';

// CONFIG
const NAME_POOL = [
    'Aarav_Kings', 'Vivaan_Pro', 'Aditya_Gamer', 'Vihaan_Lucky', 'Arjun_Warrior',
    'Sai_Spinner', 'Reyansh_07', 'Ayaan_Win', 'Krishna_Gold', 'Ishaan_Royal',
    'Shaurya_X', 'Atharv_Hero', 'Rohan_Master', 'Dhruv_Player', 'Kabir_Boss',
    'Rahul_Champ', 'Amit_Legend', 'Sneha_Queen', 'Priya_Star', 'Anjali_Rose',
    'Riya_Diamond', 'Kavya_Ace', 'Sita_Luck', 'Gita_Win', 'Pooja_777'
];

const AVATAR_SEEDS = [
    'Felix', 'Aneka', 'Zack', 'Ryker', 'Jude', 'Brooklynn', 'Cream', 'Snowball', 'Trouble', 'Mistypoo'
];

// --- PERSISTENT SIMULATION STATE ---
const SIM_DAY_KEY = 'BOT_SIM_DAY';
const SIM_RUSH_KEY = 'BOT_SIM_RUSH';

export const getSimulationState = () => {
    const day = localStorage.getItem(SIM_DAY_KEY);
    const rush = localStorage.getItem(SIM_RUSH_KEY);
    return {
        forceDay: day ? parseInt(day) : undefined,
        forceRushHour: rush === 'true'
    };
};

export const setSimulationState = (day?: number, rush?: boolean) => {
    if (day !== undefined) {
        localStorage.setItem(SIM_DAY_KEY, day.toString());
    } else {
        localStorage.removeItem(SIM_DAY_KEY);
    }

    if (rush !== undefined) {
        localStorage.setItem(SIM_RUSH_KEY, rush.toString());
    } else {
        localStorage.removeItem(SIM_RUSH_KEY);
    }
    console.log(`🕹️ Simulation State Updated: Day=${day}, Rush=${rush}`);
};

// --- HELPER: GET SCORE FOR TARGET RANK ---
// Returns the coins needed to beat the user at 'rank'
const getScoreForRank = async (targetRank: number): Promise<number> => {
    try {
        const leaderboardRef = collection(db, 'weeklyLeaderboard');
        const q = query(
            leaderboardRef,
            where('weekId', '==', getCurrentWeekId()),
            orderBy('coins', 'desc'),
            limit(targetRank + 5) // Fetch a bit more to be safe
        );
        const snapshot = await getDocs(q);

        // If leaderboard is empty or small, return a base target based on day
        if (snapshot.empty || snapshot.docs.length < targetRank) {
            // Monday: 50, Sunday: 5000 (Simulated Base)
            const day = getCurrentTime().getDay();
            const baseMap: { [key: number]: number } = { 1: 50, 2: 100, 3: 500, 4: 1000, 5: 2500, 6: 4000, 0: 6000 };
            return baseMap[day] || 100;
        }

        // Get the user at the specific rank (0-indexed)
        const targetDoc = snapshot.docs[targetRank - 1];
        if (targetDoc) {
            const data = targetDoc.data();
            // console.log(`🎯 Target Rank #${targetRank} Holder: ${data.username} (${data.coins} coins)`);
            return data.coins || 0;
        }
        return 0;
    } catch (error) {
        console.warn('Error fetching score for rank, using fallback.', error);
        return 0;
    }
};

/**
 * PERMANENT DELETE (Hard Reset)
 * Deletes bots from botUsers, users, and leaderboard.
 * Use this only for debugging or full reset.
 */
export const hardDeleteAllBots = async () => {
    try {
        console.log('🔥 Starting Hard Delete (Full Reset)...');
        const botsRef = collection(db, BOT_COLLECTION);
        const snapshot = await getDocs(botsRef);
        const batch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach((botDoc) => {
            const botId = botDoc.id;
            batch.delete(botDoc.ref); // Delete from botUsers
            batch.delete(doc(db, USER_COLLECTION, botId)); // Delete from users

            // Try to delete from leaderboard (Current & Old)
            // We'll guess the weekid or rely on query
            batch.delete(doc(db, 'weeklyLeaderboard', `${botId}_${botDoc.data().weekId}`));
            count++;
        });

        // Also clean floating leaderboard entries
        const currentWeekId = getCurrentWeekId();
        const leaderboardQ = query(
            collection(db, 'weeklyLeaderboard'),
            where('userId', '>=', 'bot_'),
            where('userId', '<=', 'bot_\uf8ff')
        );
        const lbSnapshot = await getDocs(leaderboardQ);
        lbSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`✅ Hard Deleted ${count} bots.`);
        return count;
    } catch (error) {
        console.error('❌ Error in hard delete:', error);
        throw error;
    }
};

/**
 * RETIRE OLD BOTS (Persistent Mode)
 * Moves existing bots to 'RETIRED' state.
 * Removes them from Leaderboard but KEEPS them in 'users' (Hall of Fame).
 */
export const retireOldBots = async () => {
    try {
        console.log('👴 Retiring Old Bots...');
        const botsRef = collection(db, BOT_COLLECTION);
        // Get all bots that are NOT retired
        // Note: Firestore != query is limited, so we fetch all and filter or use status check
        const snapshot = await getDocs(botsRef);

        const batch = writeBatch(db);
        let count = 0;

        for (const botDoc of snapshot.docs) {
            const botData = botDoc.data();

            // Skip if already retired
            if (botData.botTier === 'RETIRED') continue;

            // 1. Mark as RETIRED in botUsers
            batch.update(botDoc.ref, {
                botTier: 'RETIRED',
                lastActive: Timestamp.now()
            });

            // 2. Remove from Weekly Leaderboard (So they don't compete)
            const weekId = botData.weekId;
            const leaderboardRef = doc(db, 'weeklyLeaderboard', `${botDoc.id}_${weekId}`);
            batch.delete(leaderboardRef);

            // 3. DO NOT delete from 'users' (This keeps them searchable)

            count++;
        }

        await batch.commit();
        console.log(`✅ Retired ${count} bots. They are now in Hall of Fame.`);
        return count;
    } catch (error) {
        console.error('❌ Error retiring bots:', error);
        throw error;
    }
};

/**
 * Generate 3 Smart Bots for the week
 */
/**
 * Generate 3 Smart Bots for the week
 */
export const generateSmartBots = async () => {
    try {
        const weekId = getCurrentWeekId();

        // Check if bots already exist for this week
        const botsRef = collection(db, BOT_COLLECTION);
        const q = query(botsRef, where('weekId', '==', weekId));
        const snapshot = await getDocs(q);

        if (!snapshot.empty && snapshot.size >= TOTAL_BOTS) {
            console.log('🤖 Smart Bots already exist for this week.');
            return;
        }

        console.log('🤖 Generating 3 New Smart Bots...');

        // 1. Get Reserved IDs (Smart Pool)
        const reservedRef = doc(db, 'system', 'reserved_bot_ids');
        const reservedSnap = await getDoc(reservedRef);
        let reservedIds: number[] = [];
        if (reservedSnap.exists()) {
            reservedIds = reservedSnap.data().ids || [];
        }

        const batch = writeBatch(db);

        // Shuffle Arrays to get random identity
        const shuffledNames = [...NAME_POOL].sort(() => 0.5 - Math.random());
        const shuffledAvatars = [...AVATAR_SEEDS].sort(() => 0.5 - Math.random());

        // Track used IDs to remove them from pool later
        let usedReservedCount = 0;

        for (let i = 0; i < TOTAL_BOTS; i++) {
            const name = shuffledNames[i] || `Player_${Math.floor(Math.random() * 1000)}`;
            const avatarSeed = shuffledAvatars[i] || 'default';
            const photoURL = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

            // NEW: Distinct Level Ranges to create gap
            let level;
            if (i === 0) {
                // Top Player: Level 34-45
                level = Math.floor(34 + Math.random() * 12);
            } else if (i === 1) {
                // Challenger: Level 20-32
                level = Math.floor(20 + Math.random() * 13);
            } else {
                // Random/Newbie: Level 15-25
                level = Math.floor(15 + Math.random() * 11);
            }

            // Spins Formula: 10 * Level^2 (Plus some random noise 0-50 for realism)
            const totalSpins = (10 * (level * level)) + Math.floor(Math.random() * 50);
            const joinDate = new Date();
            joinDate.setDate(joinDate.getDate() - Math.floor(Math.random() * 60));

            const botUid = `bot_${weekId}_${i}`;

            // SMART ID LOGIC
            let displayId = 900000 + i; // Default fallback
            if (reservedIds.length > 0) {
                const realId = reservedIds.shift(); // Remove from local array
                if (realId) {
                    displayId = realId;
                    usedReservedCount++;
                    // console.log(`🎯 Assigned Reserved ID ${realId} to Bot ${name}`);
                }
            }

            // Bot 0 & 1 = Leaderboard, Bot 2 = Lottery
            let rankType = BotTier.SMART_LEADER;
            if (i === 2) rankType = BotTier.SMART_LOTTERY;

            const botData: any = {
                uid: botUid,
                username: name,
                photoURL: photoURL,
                email: `${name.toLowerCase()}@nomail.com`,
                level: level,
                totalSpins: totalSpins,
                coins: 0,
                weeklyCoins: 0,
                isBot: true,
                botTier: rankType, // FIXED: Using botTier enum
                weekId: weekId,
                createdAt: Timestamp.fromDate(joinDate),
                lastActive: Timestamp.now(),
                isGuest: false,
                tokens: 100,
                eTokens: Math.floor(Math.random() * 500)
            };

            const botRef = doc(db, BOT_COLLECTION, botUid);
            batch.set(botRef, botData);

            const userRef = doc(db, USER_COLLECTION, botUid);
            batch.set(userRef, {
                ...botData,
                displayId: displayId, // USE SMART ID
                referralCode: `HEX${displayId}` // USE SMART ID CODE
            });

            const leaderboardRef = doc(db, 'weeklyLeaderboard', `${botUid}_${weekId}`);
            batch.set(leaderboardRef, {
                userId: botUid,
                username: name,
                coins: 0,
                photoURL: photoURL,
                totalSpins: totalSpins,
                level: level,
                weekId,
                lastUpdated: Timestamp.now()
            });
        }

        // UPDATE RESERVED POOL
        if (usedReservedCount > 0) {
            batch.set(reservedRef, { ids: reservedIds }, { merge: true });
            console.log(`🔒 Consumed ${usedReservedCount} IDs from pool. Remaining: ${reservedIds.length}`);
        }

        await batch.commit();
        console.log('✅ Generated 3 Smart Bots successfully!');

    } catch (error) {
        console.error('❌ Error generating smart bots:', error);
    }
};

const SPIN_REWARDS = [50, 100, 150, 200, 250, 300, 400, 500, 1000, 2000, 5000];
const REWARD_WEIGHTS = [0.3, 0.25, 0.15, 0.1, 0.05, 0.05, 0.03, 0.03, 0.02, 0.01, 0.01]; // Probabilities

const getRandomSpinReward = () => {
    let random = Math.random();
    for (let i = 0; i < REWARD_WEIGHTS.length; i++) {
        if (random < REWARD_WEIGHTS[i]) {
            return SPIN_REWARDS[i];
        }
        random -= REWARD_WEIGHTS[i];
    }
    return 50; // Default fallback
};

/**
 * Returns a random number between min and max (inclusive) in steps
 */
const getRandomBetween = (min: number, max: number, step: number = 50) => {
    const range = (max - min) / step;
    return min + Math.floor(Math.random() * (range + 1)) * step;
};

const getCatchUpReward = () => {
    // Return random BIG rewards between 1200 and 3500 to look natural
    // e.g. 1250, 1800, 2350, 3100
    return getRandomBetween(1200, 3500, 50);
};

/**
 * Get the highest score of a REAL (non-bot) user from the leaderboard
 */
const getTopRealUserScore = async (weekId: string): Promise<number> => {
    try {
        const leaderboardRef = collection(db, 'weeklyLeaderboard');
        const q = query(
            leaderboardRef,
            where('weekId', '==', weekId),
            orderBy('coins', 'desc'),
            limit(10) // Check top 10
        );
        const snapshot = await getDocs(q);

        for (const doc of snapshot.docs) {
            const data = doc.data();
            // Check if this ID belongs to a bot (Bots have specific ID pattern or we check botUsers)
            // Fast check: startWith 'bot_' is our convention in generateSmartBots
            if (!data.userId.startsWith('bot_')) {
                // console.log(`👤 Top Real User Found: ${data.username} (${data.coins})`);
                return data.coins;
            }
        }
        return 0; // No real users found or they have 0 coins
    } catch (error) {
        // console.error("Error finding top real user:", error);
        return 0;
    }
};

const getMediumReward = () => {
    // Return medium rewards to maintain pace (450 - 1100)
    // e.g. 450, 700, 950
    return getRandomBetween(450, 1100, 50);
};

const getSmallRandomReward = () => {
    // Return small rewards for natural look (50 - 150)
    // e.g. 50, 60, ... 150
    return getRandomBetween(50, 150, 10);
};

/**
 * 🔒 ATTEMPT TO ACQUIRE LOCK
 * Ensures only ONE client runs the bot simulation.
 * Lock duration: 60 seconds (Runs every ~60s)
 */
const acquireBotLock = async (): Promise<boolean> => {
    try {
        const lockRef = doc(db, LOCK_COLLECTION, LOCK_DOC_ID);
        const lockSnap = await getDoc(lockRef);
        const now = Timestamp.now();

        if (lockSnap.exists()) {
            const data = lockSnap.data();
            const lastRun = data.lastRun as Timestamp;

            // Check if lock is stale (older than 45 seconds)
            // Giving 15s buffer before next expected run
            const diffSeconds = now.seconds - lastRun.seconds;

            if (diffSeconds < 45) {
                console.log(`🔒 Bot Simulation Locked. Last run: ${diffSeconds}s ago. Skipping...`);
                return false; // Lock is active, skip
            }
        }

        // Acquire Lock
        await setDoc(lockRef, {
            lastRun: now,
            lockedBy: 'client_' + Math.floor(Math.random() * 10000)
        });
        return true;

    } catch (error) {
        console.warn('⚠️ Error acquiring bot lock:', error);
        return false; // Fail safe
    }
};

/**
 * Engine: Simulate Smart Activity based on Day of Week
 * Runs for approximately 55 seconds to cover the 1-minute interval
 */
export const simulateSmartBotActivity = async (forceDay?: number, forceRushHour?: boolean) => {
    // 1. Try to Acquire Lock FIRST
    // If we're forcing simulation (manual button), we override the lock check
    const isManualRun = forceDay !== undefined || forceRushHour === true;
    if (!isManualRun) {
        const hasLock = await acquireBotLock();
        if (!hasLock) return;
    }

    const startTime = Date.now();
    const DURATION = 55 * 1000; // Run for 55 seconds

    console.log('🤖 Starting Smart Bot Simulation Loop...');

    try {
        const initialBots = await getSmartBots();
        if (initialBots.length === 0) return;

        // Note: we fetch bots ONCE at start of loop to get their IDs.
        // We will fetch their latest coins INSIDE the loop if needed?
        // Actually, for performance, we keep local state and only write changes.
        // But for SIMUALTION STATE (Admin Controls), we must check every tick.

        const weekId = getCurrentWeekId();

        // --- PRE-LOOP SETUP ---
        const botLeads: Record<string, number> = {};

        // Initial setup for leads (randomized per session)
        const leaderBots = initialBots.filter((b: any) => b.botTier !== BotTier.SMART_LOTTERY);
        const shuffledLeaders = [...leaderBots].sort(() => 0.5 - Math.random());
        if (shuffledLeaders[0]) botLeads[shuffledLeaders[0].id] = 15000 + Math.floor(Math.random() * 5000);
        if (shuffledLeaders[1]) botLeads[shuffledLeaders[1].id] = 10000 + Math.floor(Math.random() * 5000);

        // Mutable bots array to track local state during the loop
        let bots = [...initialBots];

        while (Date.now() - startTime < DURATION) {
            // 1. Wait 6 seconds (Spin Delay)
            await new Promise(r => setTimeout(r, 6000));

            // 2. CHECK SIMULATION STATE (POLL for Admin Changes) -- NEW
            const overrides = getSimulationState();
            const now = getCurrentTime();

            // Determine Effective Day
            const effectiveDay = forceDay !== undefined
                ? forceDay
                : (overrides.forceDay !== undefined ? overrides.forceDay : now.getDay());

            // Determine Rush Hour
            const timeRemainingMs = getTimeRemaining();
            const hoursRemaining = timeRemainingMs / (1000 * 60 * 60);

            const isRushHour = forceRushHour !== undefined
                ? forceRushHour
                : (overrides.forceRushHour || (effectiveDay === 0 && hoursRemaining <= 5));

            // console.log(`🕹️ Bot Loop Tick: Day=${effectiveDay}, Rush=${isRushHour}`);

            // 3. Refresh Targets (Every Spin based on NEW state)
            let currentBaseScore = 0;
            if (isRushHour) {
                currentBaseScore = await getTopRealUserScore(weekId);
            } else {
                let baseTargetRank = 50;
                if (effectiveDay === 1 || effectiveDay === 2) baseTargetRank = 45;
                else if (effectiveDay === 3) baseTargetRank = 30;
                else if (effectiveDay === 4) baseTargetRank = 20;
                else if (effectiveDay === 5 || effectiveDay === 6) baseTargetRank = 5;
                else if (effectiveDay === 0) baseTargetRank = 3;

                currentBaseScore = await getScoreForRank(baseTargetRank);
            }

            for (const bot of bots as any[]) {
                // Determine if we should act (Randomness + Time verification)
                // Don't update ALL bots every loop to reduce writes
                if (Math.random() > 0.4) continue;

                if (bot.botTier === BotTier.SMART_LOTTERY) {
                    // Lottery bot just chills and collects small amounts
                    if (Math.random() > 0.8) await updateSingleBot(bot, getRandomSpinReward(), weekId);
                    continue;
                }

                // Calculate Target
                let myTarget = 0;
                if (isRushHour) {
                    const myLead = botLeads[bot.id] || 10000;
                    myTarget = currentBaseScore + myLead;
                } else {
                    const isBotZero = bot.id.endsWith('_0');
                    if (isBotZero) myTarget = currentBaseScore + 500;
                    else myTarget = Math.max(100, currentBaseScore - 500);
                }

                // Check STATUS
                if (bot.coins < myTarget) {
                    const deficit = myTarget - bot.coins;
                    let reward = 0;

                    // TIERED REWARDS Logic
                    if (deficit > 5000) {
                        reward = getCatchUpReward();
                    } else if (deficit > 1000) {
                        reward = getMediumReward();
                    } else {
                        reward = getSmallRandomReward();
                    }

                    await updateSingleBot(bot, reward, weekId);
                    bot.coins += reward; // Update local state for next loop logic

                } else {
                    // AHEAD -> Strict Chill due to "Rank Inflation" issue
                    // Previously 20% chance caused them to climb #17 on Tuesday.
                    // Now: 1% chance just to update lastActive timestamp occasionally.
                    if (Math.random() > 0.99) {
                        const smallReward = getSmallRandomReward();
                        await updateSingleBot(bot, smallReward, weekId);
                        bot.coins += smallReward;
                    }
                }
            }

            // 4. ZOMBIE MODE (Retired Bots Logic)
            // Wake up old bots occasionally to update their "Last Active"
            if (Math.random() > 0.7) { // 30% chance per 6s tick to wake up zombies
                const retiredRef = collection(db, BOT_COLLECTION);
                // Find the 3 most dormant retired bots
                const qRetired = query(
                    retiredRef,
                    where('botTier', '==', 'RETIRED'),
                    orderBy('lastActive', 'asc'),
                    limit(3)
                );

                const zombieSnap = await getDocs(qRetired);
                if (!zombieSnap.empty) {
                    for (const zombieDoc of zombieSnap.docs) {
                        // Wake them up!
                        const zombieRef = doc(db, BOT_COLLECTION, zombieDoc.id);
                        const userRef = doc(db, USER_COLLECTION, zombieDoc.id);

                        // Just update timestamp and maybe 1 spin
                        const updates = {
                            lastActive: Timestamp.now(),
                            totalSpins: increment(1)
                        };

                        await updateDoc(zombieRef, updates);
                        await updateDoc(userRef, updates);
                        // console.log(`🧟 Zombie Woke Up: ${zombieDoc.data().username}`);
                    }
                }
            }
        }
        console.log('🤖 Bot Simulation Loop Finished.');
    } catch (error) {
        console.error('❌ Bot Simulation Loop Error:', error);
    }
};

/**
 * ATOMIC UPDATE
 * Uses `increment` to avoid race conditions (overwrite glitches).
 */
const updateSingleBot = async (bot: any, amount: number, weekId: string) => {
    // NEW: Action Based Spin Calculation
    let spinsToAdd = 1; // Default for small wins
    if (amount >= 1200) {
        spinsToAdd = 5; // Jackpot/Big Win
    } else if (amount >= 450) {
        spinsToAdd = 3; // Medium Win
    }
    // Else 1 spin for small wins (50-150)

    // 1. Update botUsers
    const botRef = doc(db, BOT_COLLECTION, bot.id);
    await updateDoc(botRef, {
        coins: increment(amount),
        weeklyCoins: increment(amount),
        totalSpins: increment(spinsToAdd),
        lastActive: Timestamp.now()
    });

    // 2. Update users (Public Profile)
    const userRef = doc(db, USER_COLLECTION, bot.id);
    await updateDoc(userRef, {
        coins: increment(amount),
        weeklyCoins: increment(amount),
        totalSpins: increment(spinsToAdd),
        lastActive: Timestamp.now()
    });

    // 3. Update Leaderboard
    const leaderboardRef = doc(db, 'weeklyLeaderboard', `${bot.id}_${weekId}`);
    // Use Set with Merge because sometimes leaderboard doc might be missing (rare)
    // Note: 'increment' works with set({ merge: true })
    await setDoc(leaderboardRef, {
        userId: bot.id,
        username: bot.username,
        photoURL: bot.photoURL,
        level: bot.level, // Level doesn't change much
        weekId: weekId,
        lastUpdated: Timestamp.now(),
        coins: increment(amount),
        totalSpins: increment(spinsToAdd)
    }, { merge: true });

    // console.log(`🤖 Updated Bot ${bot.username}: +${amount}`);
};

/**
 * Helper: Get All Smart Bots
 */
export const getSmartBots = async () => {
    try {
        const weekId = getCurrentWeekId();
        const botsRef = collection(db, BOT_COLLECTION);
        const q = query(botsRef, where('weekId', '==', weekId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        return [];
    }
};

/**
 * 🧪 TEST ONLY: Generate Demo Leaderboard
 * Creates 80 fake entries in weeklyLeaderboard to test ranking logic.
 * These are lightweight entries (no user profile).
 */
export const generateDemoLeaderboard = async (count: number = 80) => {
    try {
        console.log(`🧪 Generating ${count} Demo Bots...`);
        const weekId = getCurrentWeekId();
        const batch = writeBatch(db);

        // Random names for variety
        const ADJECTIVES = ['Super', 'Fast', 'Crazy', 'Lucky', 'Master', 'Pro', 'Epic', 'Shadow', 'Neon', 'Hyper'];
        const NOUNS = ['Spinner', 'Winner', 'King', 'Queen', 'Ninja', 'Rider', 'Gamer', 'Star', 'Wolf', 'Eagle'];

        for (let i = 0; i < count; i++) {
            const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
            const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
            const name = `${adj}${noun}_${Math.floor(Math.random() * 999)}`;

            const botId = `demo_bot_${i}`;
            const ref = doc(db, 'weeklyLeaderboard', `${botId}_${weekId}`);

            // Random coins distribution (some high, most low/mid)
            let coins = 0;
            const r = Math.random();
            if (r > 0.95) coins = 10000 + Math.floor(Math.random() * 20000); // 5% Top tier (10k-30k)
            else if (r > 0.8) coins = 5000 + Math.floor(Math.random() * 5000); // 15% High tier (5k-10k)
            else if (r > 0.5) coins = 1000 + Math.floor(Math.random() * 4000); // 30% Mid tier (1k-5k)
            else coins = 100 + Math.floor(Math.random() * 900); // 50% Low tier (100-1k)

            batch.set(ref, {
                userId: botId,
                username: name,
                photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
                level: Math.floor(1 + Math.random() * 50),
                weekId: weekId,
                lastUpdated: Timestamp.now(),
                coins: coins,
                totalSpins: Math.floor(coins / 100),
                isDemo: true // Flag to identify them easily
            });
        }

        await batch.commit();
        console.log('✅ Demo Leaderboard Populated!');
        return count;
    } catch (error) {
        console.error('❌ Error generating demo leaderboard:', error);
        throw error;
    }
};

/**
 * 🧪 TEST ONLY: Clear Demo Bots
 */
export const clearDemoLeaderboard = async () => {
    try {
        console.log('🧹 Cleaning Demo Bots...');
        const weekId = getCurrentWeekId();

        // Approach: Batch delete known ID range
        const batch = writeBatch(db);
        let deleted = 0;

        for (let i = 0; i < 200; i++) { // Cover up to 200 potential demo bots
            const botId = `demo_bot_${i}`;
            const ref = doc(db, 'weeklyLeaderboard', `${botId}_${weekId}`);
            batch.delete(ref);
            deleted++;
        }

        await batch.commit();
        console.log('✅ Demo Bots Cleared.');
    } catch (error) {
        console.error('❌ Error clearing demo bots:', error);
    }
};
