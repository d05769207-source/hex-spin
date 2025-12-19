import { useEffect, useRef } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
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
            const currentDayId = getCurrentDayId();

            // Initialize on first run if null
            if (!processedDayId.current) {
                processedDayId.current = currentDayId;
                return;
            }

            // If Day ID has changed, it's a new day!
            if (processedDayId.current !== currentDayId) {
                console.log(`🌅 [DailyReset] New Day Detected! Old: ${processedDayId.current}, New: ${currentDayId}`);

                // 1. Update Tracker Immediately to lock
                processedDayId.current = currentDayId;

                // 2. Local State Reset
                setSpinsToday(0);
                setSuperModeSpinsLeft(0);
                setSuperModeEndTime(null);

                // 3. Firestore Reset (if not guest)
                if (!user.isGuest) {
                    try {
                        const userRef = doc(db, 'users', user.id);
                        await updateDoc(userRef, {
                            spinsToday: 0,
                            superModeSpinsLeft: 0,
                            superModeEndTime: null,
                            lastSpinDate: Timestamp.now()
                        });
                        console.log("✅ [DailyReset] Firestore updated successfully.");
                    } catch (error) {
                        console.error("❌ [DailyReset] Firestore update failed:", error);
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
