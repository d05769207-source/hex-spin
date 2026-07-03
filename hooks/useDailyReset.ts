import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '../types';
import { getCurrentDayId } from '../utils/weekUtils';

export const useDailyReset = (
    user: User | null,
    setSpinsToday: (n: number) => void,
    setSuperModeSpinsLeft: (n: number) => void,
    setSuperModeEndTime: (d: Date | null) => void
) => {
    // Track the last processed Day ID (e.g., "2025-12-19")
    const processedDayId = useRef<string | null>(null);

    useEffect(() => {
        // Initial setup or when user changes
        if (!user) return;

        const checkAndReset = async () => {
            // SECURITY: Use getServerDayId to prevent device time manipulation
            const currentDayId = await import('../utils/weekUtils').then(m => m.getServerDayId());

            // Initialize on first run if null
            if (!processedDayId.current) {
                processedDayId.current = currentDayId;
                return;
            }

            // If Day ID has changed, it's a new day!
            if (processedDayId.current !== currentDayId) {
                console.log(`🌅 [DailyReset] New Day Detected! Old: ${processedDayId.current}, New: ${currentDayId}`);

                // SECURITY VALIDATION: Check against server before resetting
                if (!user.isGuest) {
                    try {
                        const { data: validation, error: valError } = await supabase.rpc('validate_daily_reset', { user_uid: user.id });
                        if (!valError && validation && validation.allowed === false) {
                            console.warn(`🚨 [DailyReset] BLOCKED: ${validation.reason}`);
                            // If blocked, we DO NOT reset local state
                            return;
                        }
                    } catch (e) {
                        console.warn("[DailyReset] Validation RPC failed, proceeding with caution", e);
                    }
                }

                // 1. Update Tracker Immediately to lock
                processedDayId.current = currentDayId;

                // 2. Local State Reset
                setSpinsToday(0);
                setSuperModeSpinsLeft(0);
                setSuperModeEndTime(null);

                // 3. Supabase Reset (if not guest)
                if (!user.isGuest) {
                    try {
                        await supabase
                            .from('users')
                            .update({
                                spins_today: 0,
                                super_mode_spins_left: 0,
                                super_mode_end_time: null,
                                last_spin_date: new Date()
                            })
                            .eq('uid', user.id);
                        console.log("✅ [DailyReset] Supabase updated successfully.");
                    } catch (error) {
                        console.error("❌ [DailyReset] Supabase update failed:", error);
                    }
                }
            }
        };

        // Check immediately
        checkAndReset();

        // Check every second (robust polling)
        const intervalId = setInterval(checkAndReset, 1000);

        return () => clearInterval(intervalId);
    }, [user, setSpinsToday, setSuperModeSpinsLeft, setSuperModeEndTime]);
};
