-- ============================================
-- Server-Side Time Validation Logic
-- Date: 2026-02-16
-- ============================================

-- 1. Helper: Calculate ISO Week Number from a Date
-- Postgres doesn't have a direct "get_week_id" ensuring our specific format "YYYY-MWxx"
-- We will match the logic: "MW" + ISO Week Number padded.

CREATE OR REPLACE FUNCTION get_current_week_id()
RETURNS TEXT AS $$
DECLARE
    now_date DATE;
    year_part TEXT;
    week_part TEXT;
BEGIN
    -- Get current date/time in UTC (or specific timezone if needed, e.g., 'Asia/Kolkata')
    -- For global consistency, we usually stick to UTC or a fixed game server time.
    -- Let's use UTC for safety, or converts to IST if game is India-specific.
    -- Assuming game logic is generally UTC or client-local was used (which is IST usually for Indian users).
    -- SAFE BET: Use timezone 'Asia/Kolkata' if the app is Indian focused (since you mentioned Hinglish/India context).
    
    now_date := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
    
    year_part := TO_CHAR(now_date, 'YYYY');
    week_part := TO_CHAR(EXTRACT(WEEK FROM now_date), 'fm00'); -- 'fm' removes leading spaces, 00 pads it
    
    RETURN year_part || '-MW' || week_part;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. RPC: Validate Weekly Reset
-- Checks if the user is allowed to reset, preventing future-date exploits.

CREATE OR REPLACE FUNCTION validate_weekly_reset(user_uid TEXT)
RETURNS JSONB AS $$
DECLARE
    server_week_id TEXT;
    user_last_week_id TEXT;
    user_exists BOOLEAN;
BEGIN
    -- 1. Get Server Week ID
    server_week_id := get_current_week_id();

    -- 2. Fetch User Data
    SELECT last_week_id INTO user_last_week_id
    FROM users
    WHERE uid = user_uid;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'allowed', false, 
            'current_week_id', server_week_id,
            'reason', 'User not found'
        );
    END IF;

    -- 3. Validation Logic
    
    -- Case A: User has NO last_week_id (New user of legacy) -> ALLOW
    IF user_last_week_id IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', true, 
            'current_week_id', server_week_id,
            'reason', 'Fresh start'
        );
    END IF;

    -- Case B: User's week ID is seemingly in the future/greater than server?
    -- String comparison works for "YYYY-MWxx" format (e.g. "2025-MW10" > "2025-MW09")
    IF user_last_week_id > server_week_id THEN
        RETURN jsonb_build_object(
            'allowed', false, 
            'current_week_id', server_week_id,
            'reason', 'Future week detected (Time manipulation suspect)'
        );
    END IF;

    -- Case C: Already on current week -> NO RESET NEEDED (but technically "allowed" to check)
    -- The client handles the "if differ" check. We just return safe server ID.
    
    RETURN jsonb_build_object(
        'allowed', true, 
        'current_week_id', server_week_id,
        'reason', 'Validation passed'
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
