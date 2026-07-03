-- ============================================
-- Security Fix: Reset Users with Future Week IDs
-- Date: 2026-02-16
-- ============================================

-- Logic:
-- If a user has a 'last_week_id' that is greater than the current server week ID,
-- it means they likely manipulated their device time to a future date.
-- We reset their 'last_week_id' to NULL so that the system FORCES a legitimate check/reset
-- on their next login or weekly reset trigger.
-- We also reset 'coins' to 0 for safety if they are in this state.

UPDATE users
SET 
    last_week_id = NULL,
    coins = 0, -- Penalty / Safety reset
    last_active = NOW()
WHERE 
    last_week_id > get_current_week_id();

-- Optional: Log affected users (For this script we just update)
