import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '../types';
import { getCurrentWeekId } from '../utils/weekUtils';
import { createWeeklyRewardMessage } from '../services/mailboxService';
import { generateSmartBots } from '../services/smartBotService';
import { syncUserToLeaderboard } from '../services/leaderboardService'; // IMPORTED

// Return type now includes isProcessing
export const useWeeklyReset = (
    user: User | null,
    liveCoins: number,
    setCoins: (n: number) => void,
    setETokens: (n: number | ((prev: number) => number)) => void
) => {
    // Determine if we are actively checking/resetting
    const [isProcessing, setIsProcessing] = useState<boolean>(true);
    // FIX: Track processed state PER USER to handle account switching
    const processedState = useRef<{ weekId: string; userId: string } | null>(null);

    useEffect(() => {
        // If no user, we are strictly NOT processing (or waiting for auth)
        // usage in App.tsx should handle the "waiting for user" part via its own loading state
        if (!user || user.isGuest) {
            setIsProcessing(false);
            return;
        }

        const checkAndReset = async () => {
            // SECURITY: Use server-side time calculation to prevent device-time hacks
            // Fallback to local if RPC fails (handled inside getServerWeekId)
            const currentWeekId = await import('../utils/weekUtils').then(m => m.getServerWeekId());
            const userWeekId = user.lastWeekId;

            console.log(`🔍 [WeeklyReset] Checking... Current (Server/calc): ${currentWeekId}, UserLast: ${userWeekId}`);

            // SECURITY VALIDATION: Check if user is trying to cheat with future time
            try {
                const { data: validation, error: valError } = await supabase.rpc('validate_weekly_reset', { user_uid: user.id });
                if (!valError && validation && validation.allowed === false) {
                    console.warn(`🚨 [WeeklyReset] BLOCKED: ${validation.reason}`);
                    setIsProcessing(false);
                    return;
                }
            } catch (e) {
                console.warn("[WeeklyReset] Validation RPC failed, proceeding with caution", e);
            }

            // 1. Check if already processed locally in this session FOR THIS USER
            if (processedState.current?.weekId === currentWeekId && processedState.current?.userId === user.id) {
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
                processedState.current = { weekId: currentWeekId, userId: user.id };

                // Calculate Rewards
                const currentCoins = liveCoins;
                const eTokensToEarn = Math.min(Math.floor(currentCoins / 1000), 20); // Cap at 20

                try {
                    // Use Supabase RPC function for atomic operation
                    const { data: userData, error: fetchError } = await supabase
                        .from('users')
                        .select('last_week_id')
                        .eq('uid', user.id)
                        .single();

                    if (fetchError || !userData) throw "User does not exist!";

                    // Double check server state
                    if (userData.last_week_id === currentWeekId) {
                        setIsProcessing(false); // Make sure to release lock
                        return; // Already happened on another device/tab
                    }

                    // Update user data
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({
                            coins: 0,
                            last_week_id: currentWeekId,
                            weekly_reset_time: new Date()
                        })
                        .eq('uid', user.id);

                    if (updateError) throw updateError;

                    // Update Local State UI
                    setCoins(0);

                    // Inbox Message (Fire-and-forget - Non-blocking optimization)
                    if (eTokensToEarn > 0) {
                        // Don't await - let it run in background to reduce blocking time
                        createWeeklyRewardMessage(user.id, eTokensToEarn, currentCoins)
                            .then(() => console.log(`✅ Weekly Reset: Sent ${eTokensToEarn} E-Tokens to inbox.`))
                            .catch(e => console.error("❌ Mailbox creation failed:", e));
                    }

                    // --- FIX #4: IMMEDIATE LEADERBOARD SYNC ---
                    // Sync immediately so user doesn't see stale leaderboard data
                    syncUserToLeaderboard(
                        user.id,
                        user.username || 'Player',
                        0, // Coins are now 0
                        user.photoURL
                    ).catch(e => console.error("⚠️ Immediate sync failed:", e));


                    // --- FIX #1: OPTIMISTIC LOCKING FOR RESERVED IDs ---
                    // Try to consume IDs with retries to handle race conditions
                    consumeReservedIdsSafe();


                    // --- FIX #2: DATABASE-BACKED BOT GENERATION ---
                    // Check DB flag instead of localStorage to prevent duplicate generation
                    tryTriggerBotGeneration(currentWeekId);

                    console.log(`✅ Weekly Reset Complete.`);

                } catch (error) {
                    console.error("❌ Error performing weekly reset:", error);
                    // Safe to release lock, might retry next interval if failed
                }
            } else if (isFirstInit) {
                // First time user init (No coins, just stamp the week)
                console.log("🆕 Initializing Week ID for fresh/empty user.");
                processedState.current = { weekId: currentWeekId, userId: user.id };
                try {
                    await supabase
                        .from('users')
                        .update({
                            last_week_id: currentWeekId
                        })
                        .eq('uid', user.id);
                } catch (e) {
                    console.error("Error init week id", e);
                }
            } else {
                // IDs match, nothing to do
                processedState.current = { weekId: currentWeekId, userId: user.id };
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
            if (processedState.current?.weekId !== currentWeekId) {
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

// --- HELPER: Optimistic Reserved ID Consumption ---
const consumeReservedIdsSafe = async () => {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            // 1. Fetch current state
            const { data: reservedData, error: fetchError } = await supabase
                .from('system')
                .select('*')
                .eq('id', 'reserved_bot_ids')
                .single();

            if (fetchError || !reservedData) return; // Silent fail if system config missing

            const allIds = reservedData.ids || [];
            if (allIds.length === 0) return; // Nothing to consume

            // 2. Local Modification
            const maxConsume = Math.min(3, allIds.length);
            const selectedIds: number[] = [];
            const newIds = [...allIds]; // Copy
            const levelPools = reservedData.level_pools || { 1: [], 2: [], 3: [], 4: [], 5: [] };

            for (let i = 0; i < maxConsume; i++) {
                // Determine index independently (or random from remaining)
                const randomIndex = Math.floor(Math.random() * newIds.length);
                const selectedId = newIds.splice(randomIndex, 1)[0];
                selectedIds.push(selectedId);

                // Update level pools
                for (let level = 1; level <= 5; level++) {
                    const poolIndex = levelPools[level]?.indexOf(selectedId);
                    if (poolIndex !== undefined && poolIndex > -1) {
                        levelPools[level].splice(poolIndex, 1);
                        break;
                    }
                }
            }

            // 3. Optimistic Update (Check if 'ids' matches what we fetched)
            // Use Supabase 'eq' on 'ids' column to ensure no one else touched it
            // Note: Postgres array equality checks order too.
            const { error: updateError, count } = await supabase
                .from('system')
                .update({
                    ids: newIds,
                    level_pools: levelPools,
                    last_updated: new Date()
                })
                .eq('id', 'reserved_bot_ids')
                .eq('ids', allIds); // SAFETY CHECK: Row must match what we read!

            // If updateError or count === 0, it means someone else updated rows -> RACE LOST
            if (updateError || count === 0) {
                console.warn(`⚠️ Reserved ID race detected. Retrying... (${attempt + 1}/${MAX_RETRIES})`);
                attempt++;
                await new Promise(r => setTimeout(r, 200 + Math.random() * 500)); // Jitter backoff
                continue; // Retry loop
            }

            console.log(`🎲 Weekly Reset: Consumed ${maxConsume} random Reserved IDs:`, selectedIds);
            return; // Success!

        } catch (e) {
            console.error("Reserved ID consumption critical error", e);
            attempt++;
        }
    }
    console.error("❌ Failed to consume Reserved IDs after retries.");
};

// --- HELPER: Database-Backed Bot Generation ---
const tryTriggerBotGeneration = async (weekId: string) => {
    try {
        // STRATEGY: Use 'system' table with ID 'bot_generation_status' for locking
        // 1. Try INSERT (First time ever for this week/system)
        const { error: insertError } = await supabase
            .from('system')
            .insert({
                id: 'bot_generation_status',
                data: { last_week_id: weekId }
            });

        if (!insertError) {
            // Insert succeeded -> We own the lock!
            console.log("🤖 Smart bots generation triggered (New Logic - Insert).");
            generateSmartBots().catch(e => console.error("Auto-gen bots failed:", e));
            return;
        }

        // 2. If Insert Failed (Row exists), try UPDATE with Conditional
        // Only update if the stored weekId is DIFFERENT
        // Note: JSONB comparison syntax requires careful usage. 
        // We use a filter to check if 'data->>last_week_id' is NOT equal to current weekId

        const { count, error: updateError } = await supabase
            .from('system')
            .update({ data: { last_week_id: weekId } })
            .eq('id', 'bot_generation_status')
            .neq('data->>last_week_id', weekId); // Only update if stale

        if (updateError) {
            console.error("Bot gen lock update error", updateError);
            return;
        }

        // If count > 0, we updated it -> We own the lock
        if (count && count > 0) {
            console.log("🤖 Smart bots generation triggered (New Logic - Update).");
            generateSmartBots().catch(e => console.error("Auto-gen bots failed:", e));
        } else {
            console.log("🤖 Bots generation skipped (Already done for this week).");
        }

    } catch (error) {
        console.error("Bot generation trigger error:", error);
    }
};
