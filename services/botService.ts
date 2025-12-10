import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    writeBatch,
    increment
} from 'firebase/firestore';
import { db } from '../firebase';
import { BotTier, BotUser, BotSystemConfig, RealUserStats, User } from '../types';
import { getCurrentWeekId, getTimeRemaining } from '../utils/weekUtils';

// Default Bot System Configuration
const DEFAULT_BOT_CONFIG: BotSystemConfig = {
    enabled: false,
    totalBots: 200,
    eliteBots: 2,
    competitiveBots: 20,
    activeBots: 50,
    casualBots: 128,
    realUserPriorityThreshold: 0.8,
    tierConfigs: {
        [BotTier.ELITE]: {
            tier: BotTier.ELITE,
            minCoins: 150,
            maxCoins: 300,
            activationHoursBeforeReset: 13,
            spinPatternType: 'steady'
        },
        [BotTier.COMPETITIVE]: {
            tier: BotTier.COMPETITIVE,
            minCoins: 80,
            maxCoins: 150,
            activationHoursBeforeReset: 11,
            spinPatternType: 'steady'
        },
        [BotTier.ACTIVE]: {
            tier: BotTier.ACTIVE,
            minCoins: 40,
            maxCoins: 80,
            activationHoursBeforeReset: 9,
            spinPatternType: 'steady'
        },
        [BotTier.CASUAL]: {
            tier: BotTier.CASUAL,
            minCoins: 10,
            maxCoins: 40,
            activationHoursBeforeReset: 7,
            spinPatternType: 'slow'
        }
    },
    lastGlobalUpdate: null
};

// Bot name templates for realistic usernames
const BOT_NAME_PREFIXES = [
    'Spinner', 'CoinKing', 'Player', 'Lucky', 'Royal', 'Golden',
    'Diamond', 'Master', 'Pro', 'Elite', 'Champion', 'Winner',
    'Star', 'Ace', 'Legend', 'Hero', 'Tiger', 'Phoenix'
];

// Get Bot System Configuration
export const getBotSystemConfig = async (): Promise<BotSystemConfig> => {
    try {
        const configRef = doc(db, 'config', 'botSystem');
        const configDoc = await getDoc(configRef);

        if (configDoc.exists()) {
            return configDoc.data() as BotSystemConfig;
        }

        // Initialize with default config
        await setDoc(configRef, DEFAULT_BOT_CONFIG);
        return DEFAULT_BOT_CONFIG;
    } catch (error) {
        console.error('Error getting bot config:', error);
        return DEFAULT_BOT_CONFIG;
    }
};

// Update Bot System Configuration
export const updateBotSystemConfig = async (config: Partial<BotSystemConfig>): Promise<void> => {
    try {
        const configRef = doc(db, 'config', 'botSystem');
        await updateDoc(configRef, config);
        console.log('✅ Bot config updated:', config);
    } catch (error) {
        console.error('Error updating bot config:', error);
        throw error;
    }
};

// Generate random bot username
const generateBotUsername = (index: number): string => {
    const prefix = BOT_NAME_PREFIXES[Math.floor(Math.random() * BOT_NAME_PREFIXES.length)];
    const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    return `${prefix}_${suffix}`;
};

// Get spin rate based on pattern
const getSpinRate = (pattern: 'fast' | 'steady' | 'slow'): number => {
    switch (pattern) {
        case 'fast': return 40; // 40 spins per hour
        case 'steady': return 25; // 25 spins per hour
        case 'slow': return 15; // 15 spins per hour
        default: return 20;
    }
};

// Generate Bot Users
export const generateBotUsers = async (): Promise<void> => {
    try {
        const config = await getBotSystemConfig();
        const batch = writeBatch(db);
        const weekId = getCurrentWeekId();

        let botIndex = 0;
        const tiers = [
            { tier: BotTier.ELITE, count: config.eliteBots },
            { tier: BotTier.COMPETITIVE, count: config.competitiveBots },
            { tier: BotTier.ACTIVE, count: config.activeBots },
            { tier: BotTier.CASUAL, count: config.casualBots }
        ];

        console.log('🤖 Generating bot users...');

        for (const tierInfo of tiers) {
            const tierConfig = config.tierConfigs[tierInfo.tier];

            for (let i = 0; i < tierInfo.count; i++) {
                botIndex++;
                const botId = `bot_${weekId}_${botIndex}`;
                const username = generateBotUsername(botIndex);

                // Random target coins within tier range
                const targetCoins = Math.floor(
                    tierConfig.minCoins + Math.random() * (tierConfig.maxCoins - tierConfig.minCoins)
                );

                const botUser: Partial<BotUser> = {
                    uid: botId,
                    username,
                    displayId: 200000 + botIndex, // Bot display IDs start from 200000
                    isGuest: false,
                    isBot: true,
                    botTier: tierInfo.tier,
                    targetCoins,
                    spinPattern: tierConfig.spinPatternType,
                    coins: 0,
                    weeklyCoins: 0,
                    eTokens: 0,
                    tokens: 999999, // Unlimited tokens for bots
                    level: Math.floor(1 + Math.random() * 10), // Random level 1-10
                    totalSpins: Math.floor(100 + Math.random() * 500), // Random total spins
                    createdAt: new Date(),
                    lastActive: new Date(),
                    photoURL: null
                };

                const botRef = doc(db, 'botUsers', botId);
                batch.set(botRef, {
                    ...botUser,
                    createdAt: Timestamp.now(),
                    lastActive: Timestamp.now(),
                    weekId
                });
            }
        }

        await batch.commit();
        console.log(`✅ Generated ${botIndex} bot users successfully!`);
    } catch (error) {
        console.error('❌ Error generating bot users:', error);
        throw error;
    }
};

// Get all bots for current week
export const getBotUsers = async (): Promise<BotUser[]> => {
    try {
        const weekId = getCurrentWeekId();
        const botsRef = collection(db, 'botUsers');
        const q = query(botsRef, where('weekId', '==', weekId));
        const snapshot = await getDocs(q);

        const bots: BotUser[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            bots.push({
                ...data,
                id: doc.id,
                createdAt: data.createdAt?.toDate(),
                lastActive: data.lastActive?.toDate(),
                activationTime: data.activationTime?.toDate(),
                lastBotUpdate: data.lastBotUpdate?.toDate()
            } as BotUser);
        });

        return bots;
    } catch (error) {
        console.error('Error fetching bot users:', error);
        return [];
    }
};

// Get Real User Statistics
export const getRealUserStats = async (): Promise<RealUserStats> => {
    try {
        const weekId = getCurrentWeekId();
        const leaderboardRef = collection(db, 'weeklyLeaderboard');

        // Get top 100 users
        const q = query(
            leaderboardRef,
            where('weekId', '==', weekId),
            orderBy('coins', 'desc'),
            limit(100)
        );

        const snapshot = await getDocs(q);
        const realUsers: number[] = [];
        const top10: number[] = [];

        let index = 0;
        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();
            const userId = data.userId;

            // Check if this is a real user (not a bot)
            if (!userId.startsWith('bot_')) {
                realUsers.push(data.coins || 0);
                if (index < 10) {
                    top10.push(data.coins || 0);
                }
            }
            index++;
        }

        const count = realUsers.length;
        const averageCoins = count > 0 ? realUsers.reduce((a, b) => a + b, 0) / count : 0;
        const maxCoins = count > 0 ? Math.max(...realUsers) : 0;
        const top10MaxCoins = top10.length > 0 ? Math.max(...top10) : 0;

        return { count, averageCoins, maxCoins, top10MaxCoins };
    } catch (error) {
        console.error('Error getting real user stats:', error);
        return { count: 0, averageCoins: 0, maxCoins: 0, top10MaxCoins: 0 };
    }
};

// Check if bots should reduce activity
export const shouldBotsReduceActivity = async (): Promise<boolean> => {
    try {
        const config = await getBotSystemConfig();
        const stats = await getRealUserStats();

        // If 80%+ of top 100 are real users, bots should back off
        return stats.count >= (100 * config.realUserPriorityThreshold);
    } catch (error) {
        console.error('Error checking bot activity:', error);
        return false;
    }
};

// Calculate bot target coins based on tier and real user stats
export const calculateBotTargetCoins = async (
    tier: BotTier,
    config: BotSystemConfig
): Promise<number> => {
    try {
        const tierConfig = config.tierConfigs[tier];
        const stats = await getRealUserStats();

        // If real users have very low coins (<100), bots can be more aggressive
        if (stats.maxCoins < 100) {
            return Math.floor(
                tierConfig.minCoins + Math.random() * (tierConfig.maxCoins - tierConfig.minCoins)
            );
        }

        // Otherwise, target slightly below real user max
        let targetMax = tierConfig.maxCoins;

        if (tier === BotTier.ELITE) {
            // Elite bots stay below top real users
            targetMax = Math.min(tierConfig.maxCoins, stats.top10MaxCoins - 20);
        } else if (tier === BotTier.COMPETITIVE) {
            targetMax = Math.min(tierConfig.maxCoins, stats.averageCoins + 30);
        }

        targetMax = Math.max(tierConfig.minCoins, targetMax);

        return Math.floor(
            tierConfig.minCoins + Math.random() * (targetMax - tierConfig.minCoins)
        );
    } catch (error) {
        console.error('Error calculating target coins:', error);
        const tierConfig = config.tierConfigs[tier];
        return Math.floor(
            tierConfig.minCoins + Math.random() * (tierConfig.maxCoins - tierConfig.minCoins)
        );
    }
};

// Check if bot should activate based on tier and time
export const shouldBotActivate = async (tier: BotTier, config: BotSystemConfig): Promise<boolean> => {
    try {
        // PATCH: Ignore strict DB config that only activates in last few hours.
        // We want bots active throughout the week.

        const timeRemainingMs = getTimeRemaining();
        const hoursRemaining = timeRemainingMs / (1000 * 60 * 60); // Convert ms to hours

        // New Logic: Activate if within 7 days (168 hours) - basically always
        // Stagger slightly so 200 don't appear at exact same millisecond
        const thresholds = {
            [BotTier.ELITE]: 168,      // Immediately
            [BotTier.COMPETITIVE]: 167,
            [BotTier.ACTIVE]: 166,
            [BotTier.CASUAL]: 160      // Wait 8 hours into week
        };

        // If hoursRemaining is LESS than threshold, we activate.
        // Since hoursRemaining counts DOWN from 168, checking <= 168 is always true.
        // Only Casual bots wait a bit.

        return hoursRemaining <= thresholds[tier];
    } catch (error) {
        console.error('Error checking bot activation:', error);
        return true; // Default to true on error to ensure visibility
    }
};

// Activate bots for the week
export const activateBotsForWeek = async (): Promise<void> => {
    try {
        const config = await getBotSystemConfig();

        if (!config.enabled) {
            console.log('⏸️ Bot system is disabled');
            return;
        }

        const bots = await getBotUsers();
        console.log(`🤖 Checking activation for ${bots.length} bots...`);
        const weekId = getCurrentWeekId();

        for (const bot of bots) {
            const shouldActivate = await shouldBotActivate(bot.botTier, config);

            // PATCH: Activate if should be active AND isn't yet. Ignore coin count check.
            if (shouldActivate && !bot.activationTime) {
                // Activate this bot
                const botRef = doc(db, 'botUsers', bot.id);
                await updateDoc(botRef, {
                    activationTime: Timestamp.now(),
                    lastBotUpdate: Timestamp.now()
                });

                // PATCH: Initialize in Leaderboard IMMEDIATELY (coins: 0)
                // This ensures they show up in the list even before they "play"
                const leaderboardRef = doc(db, 'weeklyLeaderboard', `${bot.uid}_${weekId}`);
                await setDoc(leaderboardRef, {
                    userId: bot.uid,
                    username: bot.username,
                    coins: bot.coins || 0,
                    photoURL: bot.photoURL || null,
                    totalSpins: bot.totalSpins || 0,
                    level: bot.level || 1,
                    weekId,
                    lastUpdated: Timestamp.now()
                }, { merge: true });

                console.log(`✅ Activated & Synced bot: ${bot.username} (${bot.botTier})`);
            }
        }
    } catch (error) {
        console.error('❌ Error activating bots:', error);
    }
};

// Simulate bot activity (gradual coin increase)
export const simulateBotActivity = async (): Promise<void> => {
    try {
        const config = await getBotSystemConfig();

        if (!config.enabled) {
            return;
        }

        const bots = await getBotUsers();
        const weekId = getCurrentWeekId();
        const shouldReduce = await shouldBotsReduceActivity();

        console.log(`🎮 Simulating activity for ${bots.length} bots...`);

        for (const bot of bots) {
            // Only update activated bots
            if (!bot.activationTime || bot.coins >= bot.targetCoins) {
                continue;
            }

            // Check if should reduce activity
            if (shouldReduce && bot.botTier === BotTier.ELITE) {
                console.log(`⚠️ Reducing Elite bot activity due to high real user count`);
                continue;
            }

            // Calculate coins to add (random 5-20 coins per update)
            const coinsToAdd = Math.floor(5 + Math.random() * 15);
            const newCoins = Math.min(bot.coins + coinsToAdd, bot.targetCoins);

            // Update bot coins
            const botRef = doc(db, 'botUsers', bot.id);
            await updateDoc(botRef, {
                coins: newCoins,
                weeklyCoins: newCoins,
                lastBotUpdate: Timestamp.now(),
                lastActive: Timestamp.now()
            });

            // Sync to leaderboard
            const leaderboardRef = doc(db, 'weeklyLeaderboard', `${bot.uid}_${weekId}`);
            await setDoc(leaderboardRef, {
                userId: bot.uid,
                username: bot.username,
                coins: newCoins,
                photoURL: bot.photoURL || null,
                totalSpins: bot.totalSpins || 0,
                level: bot.level || 1,
                weekId,
                lastUpdated: Timestamp.now()
            }, { merge: true });
        }

        console.log('✅ Bot activity simulation complete');
    } catch (error) {
        console.error('❌ Error simulating bot activity:', error);
    }
};

// Deactivate all bots (weekly reset)
export const deactivateAllBots = async (): Promise<void> => {
    try {
        const bots = await getBotUsers();
        const batch = writeBatch(db);

        console.log(`🔄 Deactivating ${bots.length} bots for weekly reset...`);

        for (const bot of bots) {
            const botRef = doc(db, 'botUsers', bot.id);
            batch.update(botRef, {
                coins: 0,
                weeklyCoins: 0,
                activationTime: null,
                lastBotUpdate: Timestamp.now()
            });
        }

        await batch.commit();
        console.log('✅ All bots deactivated');
    } catch (error) {
        console.error('❌ Error deactivating bots:', error);
    }
};

// Get bot leaderboard for admin view
export const getBotLeaderboard = async () => {
    try {
        const bots = await getBotUsers();
        const config = await getBotSystemConfig();

        return bots.map(bot => ({
            ...bot,
            isActivated: bot.activationTime !== null && bot.activationTime !== undefined,
            progress: bot.targetCoins > 0 ? (bot.coins / bot.targetCoins) * 100 : 0,
            tierConfig: config.tierConfigs[bot.botTier]
        })).sort((a, b) => b.coins - a.coins);
    } catch (error) {
        console.error('Error getting bot leaderboard:', error);
        return [];
    }
};

// Delete all bots (cleanup)
export const deleteAllBots = async (): Promise<void> => {
    try {
        const bots = await getBotUsers();
        const batch = writeBatch(db);

        for (const bot of bots) {
            const botRef = doc(db, 'botUsers', bot.id);
            batch.delete(botRef);
        }

        console.log(`✅ Deleted ${bots.length} bots`);
    } catch (error) {
        console.error('❌ Error deleting bots:', error);
        throw error;
    }
};

// ATTEMPT AUTO UPDATE (The "Engine")
export const attemptAutoBotUpdate = async (): Promise<void> => {
    try {
        const configRef = doc(db, 'config', 'botSystem');
        const configDoc = await getDoc(configRef);

        if (!configDoc.exists()) return;

        const config = configDoc.data() as BotSystemConfig;

        if (!config.enabled) {
            console.log('🤖 Auto-bot update skipped (System disabled)');
            return;
        }

        // Check time since last update
        const now = new Date();
        const lastUpdate = config.lastGlobalUpdate ? config.lastGlobalUpdate.toDate() : new Date(0);
        const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

        // Run every 10 minutes
        if (diffMinutes >= 10) {
            console.log(`🤖 ⏰ Triggering Auto-Bot Update (Last run: ${Math.floor(diffMinutes)} mins ago)...`);

            // 1. Lock: Update timestamp immediately to prevent double-firing
            await updateDoc(configRef, {
                lastGlobalUpdate: Timestamp.now()
            });

            // 1.5 CHECK: Do we have bots for this week?
            const currentBots = await getBotUsers();
            if (currentBots.length === 0) {
                console.log('🤖 No bots found for this week. Generaring fresh batch...');
                await generateBotUsers();
            }

            // 2. Run Actions
            await activateBotsForWeek(); // Check for new activations
            await simulateBotActivity(); // Advance bot scores

            console.log('✅ Auto-Bot Update Completed');
        } else {
            console.log(`🤖 Auto-bot update not needed yet (${Math.floor(diffMinutes)} mins since last)`);
        }

    } catch (error) {
        console.error('❌ Error in auto-bot update:', error);
    }
};
