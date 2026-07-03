-- ============================================
-- Firebase to Supabase Migration - Database Schema
-- Project: Hexfire Royal Spin
-- Date: 2025-02-10
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    username_lower TEXT NOT NULL,
    email TEXT,
    is_guest BOOLEAN DEFAULT false,
    photo_url TEXT,
    display_id INTEGER UNIQUE,
    referral_code TEXT UNIQUE,
    referral_count INTEGER DEFAULT 0,
    referral_earnings INTEGER DEFAULT 0,
    referred_by TEXT,
    referral_dismissed BOOLEAN DEFAULT false,
    coins INTEGER DEFAULT 0,
    e_tokens INTEGER DEFAULT 0,
    ktm_tokens INTEGER DEFAULT 0,
    iphone_tokens INTEGER DEFAULT 0,
    inr_balance INTEGER DEFAULT 0,
    tokens INTEGER DEFAULT 10,
    total_spins INTEGER DEFAULT 0,
    spins_today INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    super_mode_spins_left INTEGER DEFAULT 0,
    super_mode_end_time TIMESTAMPTZ,
    last_week_id TEXT,
    last_level_reward_triggered INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    last_spin_date TIMESTAMPTZ DEFAULT NOW(),
    week_start_date TIMESTAMPTZ DEFAULT NOW(),
    weekly_reset_time TIMESTAMPTZ
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(username_lower);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_display_id ON users(display_id);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- Table: weekly_leaderboard
CREATE TABLE IF NOT EXISTS weekly_leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    coins INTEGER DEFAULT 0,
    total_spins INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    photo_url TEXT,
    week_id TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_id)
);

-- Indexes for weekly_leaderboard
CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_week_id ON weekly_leaderboard(week_id);
CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_coins ON weekly_leaderboard(coins DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_user_id ON weekly_leaderboard(user_id);

-- Table: mailbox
CREATE TABLE IF NOT EXISTS mailbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    reward_type TEXT,
    reward_amount INTEGER DEFAULT 0,
    source_coins INTEGER,
    status TEXT DEFAULT 'UNREAD',
    is_expired BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ
);

-- Indexes for mailbox
CREATE INDEX IF NOT EXISTS idx_mailbox_user_id ON mailbox(user_id);
CREATE INDEX IF NOT EXISTS idx_mailbox_status ON mailbox(status);
CREATE INDEX IF NOT EXISTS idx_mailbox_expires_at ON mailbox(expires_at);
CREATE INDEX IF NOT EXISTS idx_mailbox_type ON mailbox(type);

-- Table: bot_users
CREATE TABLE IF NOT EXISTS bot_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid TEXT UNIQUE NOT NULL,
    bot_tier TEXT NOT NULL,
    week_id TEXT NOT NULL,
    display_id INTEGER UNIQUE,
    username TEXT NOT NULL,
    photo_url TEXT,
    level INTEGER DEFAULT 1,
    total_spins INTEGER DEFAULT 0,
    coins INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bot_users
CREATE INDEX IF NOT EXISTS idx_bot_users_week_id ON bot_users(week_id);
CREATE INDEX IF NOT EXISTS idx_bot_users_bot_tier ON bot_users(bot_tier);
CREATE INDEX IF NOT EXISTS idx_bot_users_uid ON bot_users(uid);

-- Table: sunday_lottery_participants
CREATE TABLE IF NOT EXISTS sunday_lottery_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    code INTEGER NOT NULL,
    prize TEXT NOT NULL,
    is_bot BOOLEAN DEFAULT false,
    username TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sunday_lottery_participants
CREATE INDEX IF NOT EXISTS idx_lottery_prize ON sunday_lottery_participants(prize);
CREATE INDEX IF NOT EXISTS idx_lottery_code ON sunday_lottery_participants(code);
CREATE INDEX IF NOT EXISTS idx_lottery_user_id ON sunday_lottery_participants(user_id);

-- Table: events
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'WAITING',
    prize TEXT NOT NULL,
    winner_code INTEGER,
    winner_name TEXT,
    winner_user_id TEXT,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_scheduled_at ON events(scheduled_at);

-- Table: counters
CREATE TABLE IF NOT EXISTS counters (
    id TEXT PRIMARY KEY,
    last_user_id INTEGER DEFAULT 100000,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize counter
INSERT INTO counters (id, last_user_id) 
VALUES ('userStats', 100000)
ON CONFLICT (id) DO NOTHING;

-- Table: system
CREATE TABLE IF NOT EXISTS system (
    id TEXT PRIMARY KEY,
    data JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize system config
INSERT INTO system (id, data) VALUES 
('reserved_bot_ids', '{"ids": [], "currentLevel": 1, "levelPools": {"1": [], "2": [], "3": [], "4": [], "5": []}}'),
('reserved_ids_config', '{"currentLevel": 1, "levels": {"1": {"maxIds": 6, "gapSize": 2, "filled": 0}, "2": {"maxIds": 10, "gapSize": 5, "filled": 0}, "3": {"maxIds": 20, "gapSize": 10, "filled": 0}, "4": {"maxIds": 50, "gapSize": 20, "filled": 0}, "5": {"maxIds": 100, "gapSize": 50, "filled": 0}}}')
ON CONFLICT (id) DO NOTHING;

-- Table: game_status
CREATE TABLE IF NOT EXISTS game_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    maintenance_mode BOOLEAN DEFAULT false,
    spin_enabled BOOLEAN DEFAULT true,
    warning_active BOOLEAN DEFAULT false,
    warning_countdown INTEGER DEFAULT 0,
    ready_countdown INTEGER DEFAULT 0,
    maintenance_message TEXT DEFAULT '',
    last_reset_time BIGINT DEFAULT 0,
    last_batch_reset_week_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize game status
INSERT INTO game_status (id, maintenance_mode, spin_enabled, warning_active, warning_countdown, ready_countdown, maintenance_message, last_reset_time) 
VALUES (1, false, true, false, 0, 0, '', 0)
ON CONFLICT (id) DO NOTHING;

-- Table: friend_requests
CREATE TABLE IF NOT EXISTS friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    sender_username TEXT NOT NULL,
    sender_photo_url TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

-- Indexes for friend_requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_id ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

-- Table: friends
CREATE TABLE IF NOT EXISTS friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    friend_username TEXT NOT NULL,
    friend_photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- Indexes for friends
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sunday_lottery_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE system ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = uid);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = uid);

CREATE POLICY "Public can read usernames for leaderboard" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = uid);

-- Mailbox policies
CREATE POLICY "Users can view own messages" ON mailbox
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own messages" ON mailbox
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own messages" ON mailbox
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Weekly leaderboard policies
CREATE POLICY "Public can read leaderboard" ON weekly_leaderboard
    FOR SELECT USING (true);

CREATE POLICY "Users can update own leaderboard entry" ON weekly_leaderboard
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own leaderboard entry" ON weekly_leaderboard
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Game status policies
CREATE POLICY "Public can read game status" ON game_status
    FOR SELECT USING (true);

CREATE POLICY "Admin can update game status" ON game_status
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- System and counters (admin only)
CREATE POLICY "Admin can read system" ON system
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can insert system" ON system
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can update system" ON system
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can delete system" ON system
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can read counters" ON counters
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can insert counters" ON counters
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can update counters" ON counters
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can delete counters" ON counters
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Bot users (public read, admin write)
CREATE POLICY "Public can read bot users" ON bot_users
    FOR SELECT USING (true);

CREATE POLICY "Admin can insert bot users" ON bot_users
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can update bot users" ON bot_users
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can delete bot users" ON bot_users
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Lottery participants
CREATE POLICY "Public can read lottery participants" ON sunday_lottery_participants
    FOR SELECT USING (true);

CREATE POLICY "Users can create lottery entries" ON sunday_lottery_participants
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admin can update lottery participants" ON sunday_lottery_participants
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can delete lottery participants" ON sunday_lottery_participants
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Events
CREATE POLICY "Public can read events" ON events
    FOR SELECT USING (true);

CREATE POLICY "Admin can insert events" ON events
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can update events" ON events
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can delete events" ON events
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Friend requests policies
CREATE POLICY "Users can view own friend requests" ON friend_requests
    FOR SELECT USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);

CREATE POLICY "Users can create friend requests" ON friend_requests
    FOR INSERT WITH CHECK (auth.uid()::text = sender_id);

CREATE POLICY "Users can update own friend requests" ON friend_requests
    FOR UPDATE USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);

CREATE POLICY "Users can delete own friend requests" ON friend_requests
    FOR DELETE USING (auth.uid()::text = sender_id OR auth.uid()::text = receiver_id);

-- Friends policies
CREATE POLICY "Users can view own friends" ON friends
    FOR SELECT USING (auth.uid()::text = user_id OR auth.uid()::text = friend_id);

CREATE POLICY "Users can create friendships" ON friends
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete friendships" ON friends
    FOR DELETE USING (auth.uid()::text = user_id OR auth.uid()::text = friend_id);

-- ============================================
-- STORAGE BUCKET
-- ============================================

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can view profile photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload own profile photo" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-photos' AND 
        auth.uid()::text = (storage.foldername(name))[0]
    );

CREATE POLICY "Users can update own profile photo" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'profile-photos' AND 
        auth.uid()::text = (storage.foldername(name))[0]
    );

CREATE POLICY "Users can delete own profile photo" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'profile-photos' AND 
        auth.uid()::text = (storage.foldername(name))[0]
    );

-- ============================================
-- REALTIME CONFIGURATION
-- ============================================

-- Enable Realtime on game_status table
ALTER PUBLICATION supabase_realtime ADD TABLE game_status;

-- Enable Realtime on weekly_leaderboard table
ALTER PUBLICATION supabase_realtime ADD TABLE weekly_leaderboard;

-- Enable Realtime on users table
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Enable Realtime on mailbox table
ALTER PUBLICATION supabase_realtime ADD TABLE mailbox;

-- Enable Realtime on friend_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;

-- Enable Realtime on friends table
ALTER PUBLICATION supabase_realtime ADD TABLE friends;

-- Enable Realtime on events table
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- Enable Realtime on system table
ALTER PUBLICATION supabase_realtime ADD TABLE system;

-- ============================================
-- POSTGRESQL RPC FUNCTIONS
-- ============================================

-- Function: increment_user_etokens
CREATE OR REPLACE FUNCTION increment_user_etokens(user_uid TEXT, amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET e_tokens = e_tokens + amount,
        last_active = NOW()
    WHERE uid = user_uid;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function: increment_user_coins
CREATE OR REPLACE FUNCTION increment_user_coins(user_uid TEXT, amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET coins = coins + amount,
        last_active = NOW()
    WHERE uid = user_uid;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function: increment_user_tokens
CREATE OR REPLACE FUNCTION increment_user_tokens(user_uid TEXT, amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET tokens = tokens + amount,
        last_active = NOW()
    WHERE uid = user_uid;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function: increment_user_ktm_tokens
CREATE OR REPLACE FUNCTION increment_user_ktm_tokens(user_uid TEXT, amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET ktm_tokens = ktm_tokens + amount,
        last_active = NOW()
    WHERE uid = user_uid;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function: increment_user_iphone_tokens
CREATE OR REPLACE FUNCTION increment_user_iphone_tokens(user_uid TEXT, amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET iphone_tokens = iphone_tokens + amount,
        last_active = NOW()
    WHERE uid = user_uid;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function: increment_user_total_spins
CREATE OR REPLACE FUNCTION increment_user_total_spins(user_uid TEXT, amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET total_spins = total_spins + amount,
        last_active = NOW()
    WHERE uid = user_uid;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function: increment_user_spins_today
CREATE OR REPLACE FUNCTION increment_user_spins_today(user_uid TEXT, amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET spins_today = spins_today + amount,
        last_active = NOW()
    WHERE uid = user_uid;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function: get_next_user_id
CREATE OR REPLACE FUNCTION get_next_user_id()
RETURNS INTEGER AS $$
DECLARE
    next_id INTEGER;
    reserved_ids INTEGER[];
    current_level INTEGER;
    level_config JSONB;
    gap_size INTEGER;
    max_ids INTEGER;
    level_pool INTEGER[];
    should_reserve BOOLEAN;
    id_to_reserve INTEGER;
BEGIN
    -- Get current counter
    SELECT last_user_id INTO next_id FROM counters WHERE id = 'userStats';
    
    -- Get reserved IDs config
    SELECT data->'ids', data->'currentLevel' 
    INTO reserved_ids, current_level
    FROM system WHERE id = 'reserved_bot_ids';
    
    -- Get level config
    SELECT data->'levels'->(current_level::text)
    INTO level_config
    FROM system WHERE id = 'reserved_ids_config';
    
    gap_size := (level_config->>'gapSize')::INTEGER;
    max_ids := (level_config->>'maxIds')::INTEGER;
    
    -- Check if we should reserve
    should_reserve := (next_id % gap_size = 0) OR (next_id = 100000);
    
    IF should_reserve THEN
        -- Reserve logic
        id_to_reserve := next_id + 2;
        next_id := next_id + 1;
        
        -- Add to reserved IDs (simplified)
        UPDATE system
        SET data = jsonb_set(
            data,
            '{ids}',
            COALESCE(data->'ids', '[]'::jsonb) || id_to_reserve
        )
        WHERE id = 'reserved_bot_ids';
    END IF;
    
    -- Update counter
    UPDATE counters
    SET last_user_id = next_id + 1,
        updated_at = NOW()
    WHERE id = 'userStats';
    
    RETURN next_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function: weekly_reset_user
CREATE OR REPLACE FUNCTION weekly_reset_user(
    user_uid TEXT,
    current_week_id TEXT,
    e_tokens_to_earn INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Update user with weekly reset
    UPDATE users
    SET 
        coins = 0,
        e_tokens = e_tokens + e_tokens_to_earn,
        last_week_id = current_week_id,
        spins_today = 0,
        last_active = NOW()
    WHERE uid = user_uid;
END;
$$ LANGUAGE plpgsql;

-- Function: sync_user_to_leaderboard
CREATE OR REPLACE FUNCTION sync_user_to_leaderboard(
    user_uid TEXT,
    user_username TEXT,
    user_coins INTEGER,
    user_photo_url TEXT,
    user_total_spins INTEGER,
    user_level INTEGER,
    week_id TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO weekly_leaderboard (user_id, username, coins, photo_url, total_spins, level, week_id, last_updated)
    VALUES (user_uid, user_username, user_coins, user_photo_url, user_total_spins, user_level, week_id, NOW())
    ON CONFLICT (user_id, week_id)
    DO UPDATE SET
        coins = EXCLUDED.coins,
        photo_url = EXCLUDED.photo_url,
        total_spins = EXCLUDED.total_spins,
        level = EXCLUDED.level,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function: get_user_rank
CREATE OR REPLACE FUNCTION get_user_rank(user_uid TEXT, week_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    user_rank INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO user_rank
    FROM weekly_leaderboard
    WHERE week_id = week_id
    AND coins > COALESCE((SELECT coins FROM weekly_leaderboard WHERE user_id = user_uid AND week_id = week_id), 0);
    
    RETURN user_rank;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function: claim_mailbox_message
CREATE OR REPLACE FUNCTION claim_mailbox_message(
    message_id UUID,
    user_uid TEXT
)
RETURNS JSONB AS $$
DECLARE
    message_data mailbox;
    result JSONB;
BEGIN
    -- Get message with ROW LOCK to prevent race conditions
    SELECT * INTO message_data
    FROM mailbox
    WHERE id = message_id AND user_id = user_uid
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message not found';
    END IF;
    
    IF message_data.status = 'CLAIMED' THEN
        RAISE EXCEPTION 'Message already claimed';
    END IF;
    
    IF message_data.expires_at IS NOT NULL AND message_data.expires_at < NOW() THEN
        RAISE EXCEPTION 'Message expired';
    END IF;
    
    -- Update user balance based on reward type
    IF message_data.reward_type = 'E_TOKEN' THEN
        PERFORM increment_user_etokens(user_uid, message_data.reward_amount);
    ELSIF message_data.reward_type = 'COINS' THEN
        PERFORM increment_user_coins(user_uid, message_data.reward_amount);
    ELSIF message_data.reward_type = 'SPIN_TOKEN' THEN
        PERFORM increment_user_tokens(user_uid, message_data.reward_amount);
    ELSIF message_data.reward_type = 'KTM_TOKEN' THEN
        PERFORM increment_user_ktm_tokens(user_uid, message_data.reward_amount);
    ELSIF message_data.reward_type = 'IPHONE_TOKEN' THEN
        PERFORM increment_user_iphone_tokens(user_uid, message_data.reward_amount);
    END IF;
    
    -- Mark as claimed
    UPDATE mailbox
    SET status = 'CLAIMED', claimed_at = NOW()
    WHERE id = message_id;
    
    -- Return result
    result := jsonb_build_object(
        'success', true,
        'rewardAmount', message_data.reward_amount,
        'rewardType', message_data.reward_type
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================

-- Function: accept_friend_request
CREATE OR REPLACE FUNCTION accept_friend_request(
    request_sender_id TEXT,
    request_sender_username TEXT,
    request_sender_photo TEXT
)
RETURNS JSONB AS $$
DECLARE
    current_user_id TEXT;
    result JSONB;
BEGIN
    current_user_id := auth.uid()::text;

    -- Check if request exists
    IF NOT EXISTS (
        SELECT 1 FROM friend_requests
        WHERE sender_id = request_sender_id AND receiver_id = current_user_id
    ) THEN
        RAISE EXCEPTION 'Friend request not found';
    END IF;

    -- Insert into friends table (bidirectional)
    INSERT INTO friends (user_id, friend_id, friend_username, friend_photo_url)
    VALUES 
        (current_user_id, request_sender_id, request_sender_username, request_sender_photo),
        (request_sender_id, current_user_id, (SELECT username FROM users WHERE uid = current_user_id), (SELECT photo_url FROM users WHERE uid = current_user_id));

    -- Delete friend request
    DELETE FROM friend_requests
    WHERE sender_id = request_sender_id AND receiver_id = current_user_id;

    result := jsonb_build_object('success', true);
    RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Update last_active timestamp
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_users_last_active
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_last_active();

-- ============================================
-- END OF SCHEMA
-- ============================================
