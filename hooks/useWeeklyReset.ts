import { useEffect, useRef } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { getCurrentWeekId } from '../utils/weekUtils';
import { createWeeklyRewardMessage } from '../services/mailboxService';
import { generateSmartBots } from '../services/smartBotService';

// Add state setters to the hook for immediate UI feedback
export const useWeeklyReset = (
    user: User | null,
    liveCoins: number,
    setCoins: (n: number) => void,
    setETokens: (n: number | ((prev: number) => number)) => void
) => {
    const processedWeekId = useRef<string | null>(null);

    useEffect(() => {
        if (!user || user.isGuest) return;

        const checkAndReset = async () => {
            const currentWeekId = getCurrentWeekId();

            console.log(`🔍 [WeeklyReset] Checking... Current: ${currentWeekId}, Last: ${user.lastWeekId}, Processed: ${processedWeekId.current}`);

            // Prevent double processing in same session if week hasn't changed
            // TRUST LOCAL STATE: If we already processed this weekId in this session, DO NOT proceed.
            // Relying on user.lastWeekId (prop) is dangerous because it might be stale (App.tsx doesn't update it in real-time listeners).
            if (processedWeekId.current === currentWeekId) {
                console.log("Skipping reset check - already processed this week locally.");
                return;
            }

            let shouldReset = false;

            // CRITICAL FIX: If we detected a change locally in this session (e.g. via interval), 
            // we MUST reset, even if the user DB is missing 'lastWeekId'.
            const isSessionWeekChange = processedWeekId.current && processedWeekId.current !== currentWeekId;

            if (isSessionWeekChange) {
                shouldReset = true;
                console.log("⚡ [WeeklyReset] Session-based week change detected. Forcing reset.");
            } else if (user.lastWeekId && user.lastWeekId !== currentWeekId) {
                shouldReset = true;
            }

            if (shouldReset) {
                // LOCK IMMEDIATELY to prevent double-firing due to race conditions (e.g. if dependencies change while awaiting)
                processedWeekId.current = currentWeekId;

                console.log("🔄 Detecting New Week! Performing Weekly Reset...");

                // 1. Calculate Conversion using LIVE coins (MAX 20 E-TOKENS CAP)
                const currentCoins = liveCoins; // Use the passed live state logic
                const eTokensToEarn = Math.min(Math.floor(currentCoins / 1000), 20); // Cap at 20 E-Tokens

                try {
                    const userRef = doc(db, 'users', user.id);

                    // 2. Reset coins and update week ID
                    await updateDoc(userRef, {
                        coins: 0, // Reset coins
                        lastWeekId: currentWeekId, // Mark this week as processed
                        weeklyResetTime: Timestamp.now() // Audit trail
                    });

                    // 2.5 Trigger Smart Bot Generation for the new week (Safe to call multiple times)
                    // This ensures bots are ready for the new week immediately.
                    generateSmartBots().catch(e => console.error("Auto-gen bots failed:", e));

                    // 3. Create inbox message for E-Token reward (if earned any)
                    if (eTokensToEarn > 0) {
                        await createWeeklyRewardMessage(user.id, eTokensToEarn, currentCoins);
                        console.log(`✅ Created inbox message for ${eTokensToEarn} E-Tokens`);
                    }

                    // 4. Notify User
                    console.log(`✅ Weekly Reset Complete. Converted ${currentCoins} coins to ${eTokensToEarn} E-Tokens.`);

                    // IMMEDIATE UI UPDATE
                    setCoins(0);
                    // NOTE: E-Tokens are NOT added here anymore - user must claim from mailbox

                    if (currentCoins > 0) {
                        console.log(`Silent Reset: User has claimable rewards in mailbox.`);
                    }

                } catch (error) {
                    console.error("❌ Error performing weekly reset:", error);
                    // If failed, maybe release lock? But safer to just fail for this session to avoid infinite loops.
                }
            } else if (!user.lastWeekId) {
                // Initialize for first time run on existing users
                processedWeekId.current = currentWeekId;
                try {
                    const userRef = doc(db, 'users', user.id);
                    await updateDoc(userRef, {
                        lastWeekId: currentWeekId
                    });
                } catch (e) {
                    console.error("Error init week id", e);
                }
            } else {
                // Nothing to do, but mark as processed so we don't keep checking
                processedWeekId.current = currentWeekId;
            }
        };

        // Initial check
        checkAndReset();

        // POLL: Check every second to match the Timer UI
        // We checking weekId change every second is efficient and robust.
        // This avoids the issue where getTimeRemaining() resets to 7 days immediately after the week flips.
        const intervalId = setInterval(() => {
            const currentWeekId = getCurrentWeekId();
            if (processedWeekId.current !== currentWeekId) {
                console.log(`⏰ [WeeklyReset] Week Changed detected! Old: ${processedWeekId.current}, New: ${currentWeekId}`);
                checkAndReset();
            }
        }, 1000);

        return () => clearInterval(intervalId);
    }, [user?.lastWeekId, liveCoins]); // Trigger when user metadata or coins change (to enable accurate calculation)
};
