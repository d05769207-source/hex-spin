import { createClient } from '@supabase/supabase-js';

// ⚠️ REPLACE THESE WITH YOUR ACTUAL SUPABASE KEYS
// Go to Supabase Dashboard -> Settings -> API
const supabaseUrl = 'https://gdmorjscrppfscfuoaif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkbW9yanNjcnBwZnNjZnVvYWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MDM0MDMsImV4cCI6MjA4MzA3OTQwM30.SACNbfYTJ1Ivw_U2rYIxZDwweSqMsKX6rcwhuzcRCDk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
