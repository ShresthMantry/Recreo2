// Ensure these environment variables are set in your .env file
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://ysavghvmswenmddlnshr.supabase.co";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzYXZnaHZtc3dlbm1kZGxuc2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5OTY4MzIsImV4cCI6MjA1ODU3MjgzMn0.GCQ0xl7wJKI_YB8d3PP1jBDcs-aRJLRLjk9-NdB1_bs";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
}

export const ACTIVITIES = {
  GAMES: 'games',
  MUSIC: 'music',
  DRAWING: 'drawing',
  JOURNAL: 'journal',
  COMMUNITY: 'community',
  BOOKS: 'books',
  YOGA: 'yoga',
} as const;

export type Activity = typeof ACTIVITIES[keyof typeof ACTIVITIES];

export const ACTIVITY_LABELS: Record<Activity, string> = {
  [ACTIVITIES.GAMES]: 'Games',
  [ACTIVITIES.MUSIC]: 'Music',
  [ACTIVITIES.DRAWING]: 'Drawing',
  [ACTIVITIES.JOURNAL]: 'Journal',
  [ACTIVITIES.COMMUNITY]: 'Community',
  [ACTIVITIES.BOOKS]: 'Books',
  [ACTIVITIES.YOGA]: 'Yoga',
};