import { useEffect, useRef, useState } from 'react';
import { doc, updateDoc, Timestamp, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { getCurrentWeekId } from '../utils/weekUtils';
import { createWeeklyRewardMessage } from '../services/mailboxService';
import { generateSmartBots } from '../services/smartBotService';

// Return type now includes isProcessing
export const useWeeklyReset = (
    user: User | null,
    liveCoins: number,
    setCoins: (n: number) => void,
    setETokens: (n: number | ((prev: number) => number)) => void
) => {
    // Determine if we are actively checking/resetting
    const [isProcessing, setIsProcessing] = useState<boolean>(true);
    const processedWeekId = useRef<string | null>(null);

    useEffect(() => {
        // If no user, we are strictly NOT processing (or waiting for auth)
        // usage in App.tsx should handle the "waiting for user" part via its own loading state
        if (!user || user.isGuest) {
            setIsProcessing(false);
            return;
        }

        const checkAndReset = async () => {
            const currentWeekId = getCurrentWeekId();
            const userWeekId = user.lastWeekId;

            console.log(`🔍 [WeeklyReset] Checking... Current: ${currentWeekId}, UserLast: ${userWeekId}`);

            // 1. Check if already processed locally in this session
            if (processedWeekId.current === currentWeekId) {
                // Already done, release lock (ensure it's false)
                setIsProcessing(false);
                return;
            }

            // Start processing lock
            setIsProcessing(true);

            // 2. Logic to determine if reset IS needed
            // Needs reset if:
            // a) Week IDs don't match (Normal case)
            // b) User has NO week ID but HAS coins (Legacy/Error case repair) -> FORCE RESET
            // c) User has NO week ID and NO coins -> Just init ID (No reset needed)

            let needsReset = false;
            let isFirstInit = false;

            if (userWeekId && userWeekId !== currentWeekId) {
                needsReset = true;
            } else if (!userWeekId) {
                if (liveCoins > 0) {
                    console.log("⚠️ [WeeklyReset] User has coins but missing Week ID. Forcing security reset.");
                    needsReset = true;
                } else {
                    isFirstInit = true;
                }
            }

            if (needsReset) {
                console.log("🔄 Detecting New Week! Performing Weekly Reset...");

                // Immediately update local ref to prevent double-firing
                processedWeekId.current = currentWeekId;

                // Calculate Rewards
                const currentCoins = liveCoins;
                const eTokensToEarn = Math.min(Math.floor(currentCoins / 1000), 20); // Cap at 20

                try {
                    const userRef = doc(db, 'users', user.id);

                    // Use Transaction for safety to ensure we don't double-reward if race condition
                    await runTransaction(db, async (transaction) => {
                        const userDoc = await transaction.get(userRef);
                        if (!userDoc.exists()) throw "User does not exist!";

                        const userData = userDoc.data();

                        // Double check server state in transaction
                        if (userData.lastWeekId === currentWeekId) {
                            return; // Already happened on another device/tab
                        }

                        transaction.update(userRef, {
                            coins: 0,
                            lastWeekId: currentWeekId,
                            weeklyResetTime: Timestamp.now()
                        });
                    });

                    // Update Local State UI
                    setCoins(0);

                    // Inbox Message (Fire-and-forget - Non-blocking optimization)
                    if (eTokensToEarn > 0) {
                        // Don't await - let it run in background to reduce blocking time
                        createWeeklyRewardMessage(user.id, eTokensToEarn, currentCoins)
                            .then(() => console.log(`✅ Weekly Reset: Sent ${eTokensToEarn} E-Tokens to inbox.`))
                            .catch(e => console.error("❌ Mailbox creation failed:", e));
                    }

                    // Random Reserved ID Consumption for Weekly Reset
                    try {
                        const reservedRef = doc(db, 'system', 'reserved_bot_ids');
                        const reservedSnap = await getDoc(reservedRef);

                        if (reservedSnap.exists()) {
                            const reservedData = reservedSnap.data();
                            const allIds = reservedData.ids || [];
                            const levelPools = reservedData.levelPools || { 1: [], 2: [], 3: [], 4: [], 5: [] };

                            if (allIds.length > 0) {
                                // Pick random IDs for this week's usage (max 3 IDs)
                                const maxConsume = Math.min(3, allIds.length);
                                const selectedIds: number[] = [];

                                for (let i = 0; i < maxConsume; i++) {
                                    const randomIndex = Math.floor(Math.random() * allIds.length);
                                    const selectedId = allIds.splice(randomIndex, 1)[0];
                                    selectedIds.push(selectedId);

                                    // Also remove from level pools
                                    for (let level = 1; level <= 5; level++) {
                                        const poolIndex = levelPools[level]?.indexOf(selectedId);
                                        if (poolIndex !== undefined && poolIndex > -1) {
                                            levelPools[level].splice(poolIndex, 1);
                                            break;
                                        }
                                    }
                                }

                                // Update Reserved IDs pool
                                await updateDoc(reservedRef, {
                                    ids: allIds,
                                    levelPools: levelPools,
                                    lastUpdated: Timestamp.now()
                                });

                                console.log(`🎲 Weekly Reset: Consumed ${maxConsume} random Reserved IDs:`, selectedIds);
                            }
                        }
                    } catch (error) {
                        console.error("⚠️ Reserved ID consumption failed (non-critical):", error);
                        // Non-blocking - don't throw
                    }

                    // Smart Bots - Only generate once per week (not on every user login)
                    // Check if this is the first reset of the week
                    const botsKey = `bots_generated_${currentWeekId}`;
                    const botsGenerated = localStorage.getItem(botsKey);
                    if (!botsGenerated) {
                        localStorage.setItem(botsKey, 'true');
                        generateSmartBots().catch(e => console.error("Auto-gen bots failed:", e));
                        console.log("🤖 Smart bots generation triggered for new week");
                    }

                    console.log(`✅ Weekly Reset Complete.`);

                } catch (error) {
                    console.error("❌ Error performing weekly reset:", error);
                    // Safe to release lock, might retry next interval if failed
                }
            } else if (isFirstInit) {
                // First time user init (No coins, just stamp the week)
                console.log("🆕 Initializing Week ID for fresh/empty user.");
                processedWeekId.current = currentWeekId;
                try {
                    await updateDoc(doc(db, 'users', user.id), {
                        lastWeekId: currentWeekId
                    });
                } catch (e) {
                    console.error("Error init week id", e);
                }
            } else {
                // IDs match, nothing to do
                processedWeekId.current = currentWeekId;
            }

            // REQUIRED: Release processing lock so App can allow entry
            setIsProcessing(false);
        };

        // Run Logic
        checkAndReset();

        // POLL: Check every 5 seconds (1s is too aggressive for DB reads usually, but local check is cheap)
        const intervalId = setInterval(() => {
            const currentWeekId = getCurrentWeekId();
            // If week changes while app is open, we trigger again
            if (processedWeekId.current !== currentWeekId) {
                console.log(`⏰ [WeeklyReset] Live Week Change detected!`);
                checkAndReset();
            }
        }, 5000);

        return () => clearInterval(intervalId);

    }, [user?.lastWeekId, user?.id, liveCoins]);
    // ^ IMPORTANT: Dependency on user.lastWeekId ensures we re-check if user updates. 
    // liveCoins dependency ensures we have fresh value for calculation.

    return { isProcessing };
};
