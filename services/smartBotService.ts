import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs, Timestamp, writeBatch, orderBy, limit } from 'firebase/firestore';
import { BotUser, User, BotTier } from '../types';
import { getCurrentWeekId, getTimeRemaining, getCurrentTime } from '../utils/weekUtils';

// CONSTANTS
const TOTAL_BOTS = 3;
const BOT_COLLECTION = 'botUsers';
const USER_COLLECTION = 'users';

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

        // If leaderboard is empty or small
        if (snapshot.empty || snapshot.docs.length < targetRank) {
            return 100; // Default base score
        }

        // Get the user at the specific rank (0-indexed)
        const targetDoc = snapshot.docs[targetRank - 1];
        if (targetDoc) {
            const data = targetDoc.data();
            console.log(`🎯 Target Rank #${targetRank} Holder: ${data.username} (${data.coins} coins)`);
            return data.coins || 0;
        }
        console.log(`⚠️ No one found at Rank #${targetRank}`);
        return 0;
    } catch (error) {
        // console.error('Error fetching score for rank:', error);
        return 0;
    }
};

/**
 * Clean up ALL legacy bots (safayi abhiyaan)
 */
export const cleanupLegacyBots = async () => {
    try {
        console.log('🧹 Starting Safayi Abhiyaan (Cleanup)...');
        // Delete from botUsers collection
        const botsRef = collection(db, BOT_COLLECTION);
        const snapshot = await getDocs(botsRef);

        const batch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
            count++;
        });

        await batch.commit();
        console.log(`✅ Deleted ${count} old bots.`);
        return count;
    } catch (error) {
        console.error('❌ Error cleaning bots:', error);
        throw error;
    }
};

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
        const batch = writeBatch(db);

        // Shuffle Arrays to get random identity
        const shuffledNames = [...NAME_POOL].sort(() => 0.5 - Math.random());
        const shuffledAvatars = [...AVATAR_SEEDS].sort(() => 0.5 - Math.random());

        for (let i = 0; i < TOTAL_BOTS; i++) {
            const name = shuffledNames[i] || `Player_${Math.floor(Math.random() * 1000)}`;
            const avatarSeed = shuffledAvatars[i] || 'default';
            const photoURL = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

            const level = Math.floor(5 + Math.random() * 45);
            const totalSpins = Math.floor(500 + Math.random() * 4500);
            const joinDate = new Date();
            joinDate.setDate(joinDate.getDate() - Math.floor(Math.random() * 60));

            const botUid = `bot_${weekId}_${i}`;

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
                displayId: 900000 + i,
                referralCode: `BOT${i}${Math.floor(Math.random() * 999)}`
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

        await batch.commit();
        console.log('✅ Generated 3 Smart Bots successfully!');

    } catch (error) {
        console.error('❌ Error generating smart bots:', error);
    }
};

/**
 * Engine: Simulate Smart Activity based on Day of Week
 * Called frequently (e.g. every 2-10 mins)
 * @param forceDay Optional: Override day of week (0-6) for testing
 * @param forceRushHour Optional: Override rush hour status for testing
 */
export const simulateSmartBotActivity = async (forceDay?: number, forceRushHour?: boolean) => {
    try {
        const bots = await getSmartBots();
        if (bots.length === 0) return;

        const now = getCurrentTime(); // Use simulated time if active
        // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const dayOfWeek = forceDay !== undefined ? forceDay : now.getDay();
        const weekId = getCurrentWeekId();

        // Check if it's "Rush Hour" (Sunday < 5 hours remaining)
        const timeRemainingMs = getTimeRemaining();
        const hoursRemaining = timeRemainingMs / (1000 * 60 * 60);

        // Use forced rush hour if provided, otherwise calc real logic (only if Sunday)
        const isRushHour = forceRushHour !== undefined
            ? forceRushHour
            : (dayOfWeek === 0 && hoursRemaining <= 5);

        console.log(`🤖 Simulating Smart Activity. Day: ${dayOfWeek}, RushHour: ${isRushHour}, Bots: ${bots.length}`);

        // Define Target Rank based on Schedule
        let targetRank = 50; // Default: Stay low

        if (isRushHour) {
            targetRank = 1; // AIM FOR THE TOP!
        } else {
            // Monday (1) & Tuesday (2): Rank 50+
            if (dayOfWeek === 1 || dayOfWeek === 2) targetRank = 50;
            // Wednesday (3): Top 30
            else if (dayOfWeek === 3) targetRank = 30;
            // Thursday (4): Top 20
            else if (dayOfWeek === 4) targetRank = 20;
            // Friday (5) & Saturday (6): Top 5-10
            else if (dayOfWeek === 5 || dayOfWeek === 6) targetRank = 5;
            // Sunday (0) (Before Rush): Top 3-5
            else if (dayOfWeek === 0) targetRank = 3;
        }

        // Get Score needed to beat that rank
        const scoreToBeat = await getScoreForRank(targetRank);
        // Add random buffer (so they don't just match, they beat or stay close)
        const targetScore = isRushHour
            ? scoreToBeat + Math.floor(Math.random() * 500) + 100 // Aggressive Beat
            : scoreToBeat > 0 ? scoreToBeat + Math.floor(Math.random() * 50) : 50; // Gentle Beat 

        // Update Bots
        for (const bot of bots as any[]) {
            // LOTTERY Bot doesn't need to dominate leaderboard (keep it mid-range)
            // Use correct Enum Check
            if (bot.botTier === BotTier.SMART_LOTTERY) {
                // Keep Lottery bot around Rank 20-30 always
                if (Math.random() > 0.7) { // 30% chance to update
                    await updateSingleBot(bot, Math.floor(Math.random() * 20), weekId);
                }
                continue;
            }

            // LEADERBOARD Bots (The Smart Ones)
            // They check if they are BEHIND the target score
            if (bot.coins < targetScore) {
                // Determine how much to specific add
                // If Rush Hour, add BIG chunks. If normal, add small chunks.
                const gap = targetScore - bot.coins;
                let addAmount = 0;

                if (isRushHour) {
                    // Close the gap fast! (80% catch up per tick)
                    addAmount = Math.ceil(gap * 0.8) + Math.floor(Math.random() * 100);
                } else {
                    // Slow steady climb
                    addAmount = Math.floor(5 + Math.random() * 25);
                }

                // Apply Update
                if (addAmount > 0) {
                    await updateSingleBot(bot, addAmount, weekId);
                }
            } else {
                // If already ahead of target, maybe just add tiny bit to look active
                if (Math.random() > 0.8) {
                    await updateSingleBot(bot, Math.floor(1 + Math.random() * 5), weekId);
                }
            }
        }

    } catch (error) {
        console.error('❌ Error simulating smart activity:', error);
    }
};

const updateSingleBot = async (bot: any, amount: number, weekId: string) => {
    const newCoins = (bot.coins || 0) + amount;
    const newTotalSpins = (bot.totalSpins || 0) + Math.ceil(amount / 5); // Rough spin calc

    // 1. Update botUsers
    const botRef = doc(db, BOT_COLLECTION, bot.id);
    await updateDoc(botRef, {
        coins: newCoins,
        weeklyCoins: newCoins,
        totalSpins: newTotalSpins,
        lastActive: Timestamp.now()
    });

    // 2. Update users (Public Profile)
    const userRef = doc(db, USER_COLLECTION, bot.id);
    await updateDoc(userRef, {
        coins: newCoins,
        weeklyCoins: newCoins,
        totalSpins: newTotalSpins,
        lastActive: Timestamp.now()
    });

    // 3. Update Leaderboard
    const leaderboardRef = doc(db, 'weeklyLeaderboard', `${bot.id}_${weekId}`);
    // Use Set with Merge to be safe
    await setDoc(leaderboardRef, {
        userId: bot.id,
        username: bot.username,
        coins: newCoins,
        photoURL: bot.photoURL,
        totalSpins: newTotalSpins,
        level: bot.level, // Level doesn't change much for now
        weekId: weekId,
        lastUpdated: Timestamp.now()
    }, { merge: true });

    // console.log(`🤖 Updated Bot ${bot.username}: +${amount} coins`);
};

/**
 * Helper: Get All Smart Bots
 */
export const getSmartBots = async () => {
    try {
        const botsRef = collection(db, BOT_COLLECTION);
        const snapshot = await getDocs(botsRef);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        return [];
    }
};
