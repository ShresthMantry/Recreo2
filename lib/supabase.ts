import { createClient } from '@supabase/supabase-js';

// Use direct values instead of importing from constants to avoid any path issues
const SUPABASE_URL = "https://ysavghvmswenmddlnshr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXZnaHZtc3dlbm1kZGxuc2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTY4MzIsImV4cCI6MjA1ODU3MjgzMn0.GCQ0xl7wJKI_YB8d3PP1jBDcs-aRJLRLjk9-NdB1_bs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);