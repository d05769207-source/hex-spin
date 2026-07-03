-- ====================================================================
-- Unified Fix: Missing and Buggy RPC Functions for Hexfire Royal Spin
-- Date: 2026-07-03
-- Instructions: Run this script in the Supabase Dashboard SQL Editor.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. Locking System (For Bot Simulation & Cron runs)
-- --------------------------------------------------------------------

-- Table: bot_locks
CREATE TABLE IF NOT EXISTS bot_locks (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    acquired_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for security
ALTER TABLE bot_locks ENABLE ROW LEVEL SECURITY;

-- Public can view locks, but can't modify directly without RPC
DROP POLICY IF EXISTS "Public can view bot locks" ON bot_locks;
CREATE POLICY "Public can view bot locks" ON bot_locks
    FOR SELECT USING (true);

-- Function: acquire_bot_lock
-- Atomic distributed locking system
CREATE OR REPLACE FUNCTION acquire_bot_lock(
    p_lock_id TEXT,
    p_client_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_lock RECORD;
    v_lock_duration INTERVAL := INTERVAL '60 seconds';
BEGIN
    -- 1. Fetch current lock if it exists
    SELECT * INTO v_current_lock FROM bot_locks WHERE id = p_lock_id;

    IF NOT FOUND THEN
        -- No lock exists, acquire it
        INSERT INTO bot_locks (id, client_id, acquired_at)
        VALUES (p_lock_id, p_client_id, NOW())
        ON CONFLICT (id) DO UPDATE
        SET client_id = EXCLUDED.client_id,
            acquired_at = EXCLUDED.acquired_at;
        RETURN TRUE;
    END IF;

    -- 2. If lock has expired (older than 60s) OR belongs to the same client, allow overwrite/renewal
    IF v_current_lock.acquired_at < NOW() - v_lock_duration OR v_current_lock.client_id = p_client_id THEN
        UPDATE bot_locks
        SET client_id = p_client_id,
            acquired_at = NOW()
        WHERE id = p_lock_id;
        RETURN TRUE;
    END IF;

    -- 3. Lock is active and belongs to someone else
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- --------------------------------------------------------------------
-- 2. Time Functions (TimeZone Aware)
-- --------------------------------------------------------------------

-- Function: get_current_day_id
-- Returns the current day ID in Asia/Kolkata timezone (format: YYYY-MM-DD)
CREATE OR REPLACE FUNCTION get_current_day_id()
RETURNS TEXT AS $$
DECLARE
    now_date DATE;
BEGIN
    now_date := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;
    RETURN TO_CHAR(now_date, 'YYYY-MM-DD');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- --------------------------------------------------------------------
-- 3. Leaderboard & Ranking Functions
-- --------------------------------------------------------------------

-- Function: get_user_rank (Bug Fixed)
-- Fixes parameter collision issue where 'week_id = week_id' matched all rows
DROP FUNCTION IF EXISTS get_user_rank(text, text);
DROP FUNCTION IF EXISTS get_user_rank(p_user_uid text, p_week_id text);

CREATE OR REPLACE FUNCTION get_user_rank(p_user_uid TEXT, p_week_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    user_rank INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO user_rank
    FROM weekly_leaderboard
    WHERE week_id = p_week_id
      AND coins > COALESCE((
          SELECT coins 
          FROM weekly_leaderboard 
          WHERE user_id = p_user_uid AND week_id = p_week_id
      ), 0);
    
    RETURN user_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: sync_user_to_leaderboard (Parameter Names Fixed)
-- Matches frontend calling parameters prefix 'p_'
DROP FUNCTION IF EXISTS sync_user_to_leaderboard(text, text, integer, text, integer, integer, text);
DROP FUNCTION IF EXISTS sync_user_to_leaderboard(p_user_uid text, p_user_username text, p_user_coins integer, p_user_photo_url text, p_user_total_spins integer, p_user_level integer, p_week_id text);

CREATE OR REPLACE FUNCTION sync_user_to_leaderboard(
    p_user_uid TEXT,
    p_user_username TEXT,
    p_user_coins INTEGER,
    p_user_photo_url TEXT,
    p_user_total_spins INTEGER,
    p_user_level INTEGER,
    p_week_id TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO weekly_leaderboard (user_id, username, coins, photo_url, total_spins, level, week_id, last_updated)
    VALUES (p_user_uid, p_user_username, p_user_coins, p_user_photo_url, p_user_total_spins, p_user_level, p_week_id, NOW())
    ON CONFLICT (user_id, week_id)
    DO UPDATE SET
        coins = EXCLUDED.coins,
        photo_url = EXCLUDED.photo_url,
        total_spins = EXCLUDED.total_spins,
        level = EXCLUDED.level,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- --------------------------------------------------------------------
-- 4. Bot Management Systems
-- --------------------------------------------------------------------

-- Function: generate_bot_user
-- Atomic generation of a simulated bot user profile
CREATE OR REPLACE FUNCTION generate_bot_user(
    p_uid TEXT,
    p_username TEXT,
    p_photo_url TEXT,
    p_level INTEGER,
    p_total_spins INTEGER,
    p_coins INTEGER,
    p_bot_tier TEXT,
    p_week_id TEXT,
    p_display_id INTEGER,
    p_e_tokens INTEGER,
    p_tokens INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- A. Insert/Update into 'users' table
    INSERT INTO users (
        uid,
        username,
        username_lower,
        photo_url,
        level,
        total_spins,
        coins,
        last_week_id,
        display_id,
        e_tokens,
        tokens,
        is_guest,
        created_at,
        last_active
    )
    VALUES (
        p_uid,
        p_username,
        LOWER(p_username),
        p_photo_url,
        p_level,
        p_total_spins,
        p_coins,
        p_week_id,
        p_display_id,
        p_e_tokens,
        p_tokens,
        FALSE,
        NOW(),
        NOW()
    )
    ON CONFLICT (uid) 
    DO UPDATE SET
        username = EXCLUDED.username,
        username_lower = EXCLUDED.username_lower,
        photo_url = EXCLUDED.photo_url,
        level = EXCLUDED.level,
        total_spins = EXCLUDED.total_spins,
        coins = EXCLUDED.coins,
        last_week_id = EXCLUDED.last_week_id,
        display_id = EXCLUDED.display_id,
        e_tokens = EXCLUDED.e_tokens,
        tokens = EXCLUDED.tokens,
        last_active = NOW();

    -- B. Insert/Update into 'bot_users' table
    INSERT INTO bot_users (
        uid,
        bot_tier,
        week_id,
        display_id,
        username,
        photo_url,
        level,
        total_spins,
        coins,
        created_at,
        last_active
    )
    VALUES (
        p_uid,
        p_bot_tier,
        p_week_id,
        p_display_id,
        p_username,
        p_photo_url,
        p_level,
        p_total_spins,
        p_coins,
        NOW(),
        NOW()
    )
    ON CONFLICT (uid)
    DO UPDATE SET
        bot_tier = EXCLUDED.bot_tier,
        week_id = EXCLUDED.week_id,
        display_id = EXCLUDED.display_id,
        username = EXCLUDED.username,
        photo_url = EXCLUDED.photo_url,
        level = EXCLUDED.level,
        total_spins = EXCLUDED.total_spins,
        coins = EXCLUDED.coins,
        last_active = NOW();

    -- C. Insert/Update into 'weekly_leaderboard' (Skip if they are only lottery bots)
    IF p_bot_tier <> 'SMART_LOTTERY' AND p_bot_tier <> 'SMART_LOTTERY_KTM' THEN
        INSERT INTO weekly_leaderboard (
            user_id,
            username,
            coins,
            photo_url,
            total_spins,
            level,
            week_id,
            last_updated
        )
        VALUES (
            p_uid,
            p_username,
            p_coins,
            p_photo_url,
            p_total_spins,
            p_level,
            p_week_id,
            NOW()
        )
        ON CONFLICT (user_id, week_id)
        DO UPDATE SET
            username = EXCLUDED.username,
            coins = EXCLUDED.coins,
            photo_url = EXCLUDED.photo_url,
            total_spins = EXCLUDED.total_spins,
            level = EXCLUDED.level,
            last_updated = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: retire_old_bots
-- Retires active bots from leaderboard, preserving their status in users
CREATE OR REPLACE FUNCTION retire_old_bots()
RETURNS INTEGER AS $$
DECLARE
    retired_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO retired_count FROM bot_users WHERE bot_tier <> 'RETIRED';
    
    -- Remove them from active weekly leaderboard
    DELETE FROM weekly_leaderboard WHERE user_id IN (SELECT uid FROM bot_users WHERE bot_tier <> 'RETIRED');
    
    -- Update bot status to 'RETIRED'
    UPDATE bot_users
    SET bot_tier = 'RETIRED'
    WHERE bot_tier <> 'RETIRED';
    
    RETURN retired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: hard_delete_all_bots
-- Hard delete bots from bot_users, weekly_leaderboard, and users
CREATE OR REPLACE FUNCTION hard_delete_all_bots()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO deleted_count FROM bot_users;
    
    -- Delete from leaderboard
    DELETE FROM weekly_leaderboard WHERE user_id IN (SELECT uid FROM bot_users);
    
    -- Delete from users
    DELETE FROM users WHERE uid IN (SELECT uid FROM bot_users);
    
    -- Clear from bot_users
    DELETE FROM bot_users;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: update_reserved_ids_config
-- Updates 'currentLevel' in reserved ids config
CREATE OR REPLACE FUNCTION update_reserved_ids_config(p_current_level INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE system
    SET data = jsonb_set(data, '{currentLevel}', to_jsonb(p_current_level)),
        updated_at = NOW()
    WHERE id = 'reserved_ids_config';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: update_reserved_ids
-- Updates reserved IDs system document structure
CREATE OR REPLACE FUNCTION update_reserved_ids(
    p_ids INTEGER[],
    p_current_level INTEGER,
    p_level_pools JSONB
)
RETURNS VOID AS $$
BEGIN
    UPDATE system
    SET data = jsonb_build_object(
        'ids', to_jsonb(p_ids),
        'currentLevel', p_current_level,
        'levelPools', p_level_pools
    ),
    updated_at = NOW()
    WHERE id = 'reserved_bot_ids';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: update_bot_stats
-- Increments bot user status changes atomically
CREATE OR REPLACE FUNCTION update_bot_stats(
    p_uid TEXT,
    p_week_id TEXT,
    p_amount INTEGER,
    p_spins_to_add INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- 1. Update bot_users table
    UPDATE bot_users
    SET coins = coins + p_amount,
        total_spins = total_spins + p_spins_to_add,
        last_active = NOW()
    WHERE uid = p_uid;

    -- 2. Update weekly_leaderboard table
    UPDATE weekly_leaderboard
    SET coins = coins + p_amount,
        total_spins = total_spins + p_spins_to_add,
        last_updated = NOW()
    WHERE user_id = p_uid AND week_id = p_week_id;

    -- 3. Update users table
    UPDATE users
    SET coins = coins + p_amount,
        total_spins = total_spins + p_spins_to_add,
        last_active = NOW()
    WHERE uid = p_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: generate_demo_leaderboard
-- Generates fake sandbox ranking data in the weekly leaderboard
CREATE OR REPLACE FUNCTION generate_demo_leaderboard(
    p_week_id TEXT,
    p_count INTEGER
)
RETURNS VOID AS $$
DECLARE
    i INTEGER;
    random_coins INTEGER;
    random_spins INTEGER;
    random_level INTEGER;
BEGIN
    FOR i IN 0..(p_count - 1) LOOP
        -- Simulate ranking metrics
        random_coins := floor(random() * 12000)::INTEGER;
        random_spins := floor(random() * 150)::INTEGER;
        random_level := floor(random() * 15 + 1)::INTEGER;

        INSERT INTO weekly_leaderboard (user_id, username, coins, total_spins, level, photo_url, week_id, last_updated)
        VALUES (
            'demo_bot_' || i,
            'Player_' || (1000 + i),
            random_coins,
            random_spins,
            random_level,
            NULL,
            p_week_id,
            NOW()
        )
        ON CONFLICT (user_id, week_id)
        DO UPDATE SET
            coins = EXCLUDED.coins,
            total_spins = EXCLUDED.total_spins,
            level = EXCLUDED.level,
            last_updated = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- --------------------------------------------------------------------
-- 5. Storage and Table Policy Fixes
-- --------------------------------------------------------------------

-- Fix Storage Policies (Postgres arrays are 1-indexed, so [0] was returning NULL)
DROP POLICY IF EXISTS "Users can upload own profile photo" ON storage.objects;
CREATE POLICY "Users can upload own profile photo" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-photos' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can update own profile photo" ON storage.objects;
CREATE POLICY "Users can update own profile photo" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'profile-photos' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete own profile photo" ON storage.objects;
CREATE POLICY "Users can delete own profile photo" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'profile-photos' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Fix System table policy (allow public/client reads)
DROP POLICY IF EXISTS "Admin can read system" ON system;
DROP POLICY IF EXISTS "Public can read system" ON system;
CREATE POLICY "Public can read system" ON system
    FOR SELECT USING (true);

-- Ensure Events table policy allows public reads
DROP POLICY IF EXISTS "Public can read events" ON events;
CREATE POLICY "Public can read events" ON events
    FOR SELECT USING (true);

