import { useEffect, useRef } from 'react';
import { doc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { getCurrentWeekId, getTimeRemaining } from '../utils/weekUtils';

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
            if (processedWeekId.current === currentWeekId) {
                // If the user's DB says they are already in this week, we are good.
                if (user.lastWeekId === currentWeekId) {
                    return;
                }
                // If DB is stale but we processed locally, we might skip, 
                // BUT we loop to ensure DB is consistent.
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
                console.log("🔄 Detecting New Week! Performing Weekly Reset...");

                // 1. Calculate Conversion using LIVE coins
                const currentCoins = liveCoins; // Use the passed live state logic
                const eTokensToEarn = Math.floor(currentCoins / 1000);

                try {
                    const userRef = doc(db, 'users', user.id);

                    // 2. Perform Update
                    await updateDoc(userRef, {
                        coins: 0, // Reset coins
                        eTokens: increment(eTokensToEarn), // Add E-Tokens
                        lastWeekId: currentWeekId, // Mark this week as processed
                        weeklyResetTime: Timestamp.now() // Audit trail
                    });

                    // 3. Notify User
                    console.log(`✅ Weekly Reset Complete. Converted ${currentCoins} coins to ${eTokensToEarn} E-Tokens.`);

                    // IMMEDIATE UI UPDATE
                    setCoins(0);
                    setETokens(prev => prev + eTokensToEarn);

                    if (currentCoins > 0) {
                        alert(`Weekly Reset!\n\nNew Week Started.\nYour ${currentCoins} Coins have been converted to ${eTokensToEarn} E-Tokens.\nGood luck for this week!`);
                    }

                } catch (error) {
                    console.error("❌ Error performing weekly reset:", error);
                }
            } else if (!user.lastWeekId) {
                // Initialize for first time run on existing users
                try {
                    const userRef = doc(db, 'users', user.id);
                    await updateDoc(userRef, {
                        lastWeekId: currentWeekId
                    });
                } catch (e) {
                    console.error("Error init week id", e);
                }
            }

            processedWeekId.current = currentWeekId;
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
