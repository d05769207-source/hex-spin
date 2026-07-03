-- ============================================
-- Fix: Missing Bot Photo System Schema
-- Date: 2026-02-16
-- ============================================

-- 1. Create the 'bot_profile_photos' table
CREATE TABLE IF NOT EXISTS bot_profile_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    storage_url TEXT NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_by_bot_uid TEXT,        -- Tracks which bot (e.g., bot_2025-W10_0) used it
    used_by_display_id INTEGER,  -- Tracks which visual ID (e.g., 1005) used it
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Index for fast lookup of unused photos
CREATE INDEX IF NOT EXISTS idx_bot_photos_is_used ON bot_profile_photos(is_used);

-- RLS Policies for bot_profile_photos
ALTER TABLE bot_profile_photos ENABLE ROW LEVEL SECURITY;

-- Public can read photos (to display them)
CREATE POLICY "Public can view bot photos" ON bot_profile_photos
    FOR SELECT USING (true);

-- Admin can manage photos
CREATE POLICY "Admin can all bot photos" ON bot_profile_photos
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');


-- 2. Create the 'markBotPhotoUsed' RPC function
-- This function allows the backend (or authorized client) to atomically mark a photo as used.
-- We use SECURITY DEFINER to allow the function to bypass RLS if needed, OR relies on service role.
-- Since the user logic calls this, we need to ensure it's safe. 
-- Assuming 'service_role' or admin calls this mostly, but if client calls it, we might need checks.
-- For now, we'll match the logic expected by 'smartBotService.ts'.

CREATE OR REPLACE FUNCTION mark_bot_photo_used(
    p_photo_id UUID,
    p_bot_uid TEXT,
    p_display_id INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE bot_profile_photos
    SET 
        is_used = true,
        used_by_bot_uid = p_bot_uid,
        used_by_display_id = p_display_id,
        last_used_at = NOW()
    WHERE id = p_photo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- SECURITY DEFINER allows this to safeguard the update even if the anon user doesn't have direct UPDATE rights on the table.

-- 3. (Optional) RPC to reset all photos (for testing/weekly reset if needed)
CREATE OR REPLACE FUNCTION reset_all_bot_photos()
RETURNS VOID AS $$
BEGIN
    UPDATE bot_profile_photos
    SET 
        is_used = false,
        used_by_bot_uid = null,
        used_by_display_id = null,
        last_used_at = null;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
