// Your Supabase project, built into the app so a new PC only needs to sign in.
// Both values are safe to ship: the publishable key can only do what the security rules in
// supabase/setup.sql and supabase/teams-0.20.sql allow. Never put the secret key here.
export const CLOUD_URL = 'https://oiykeulhakbjlwsaxmad.supabase.co';
export const CLOUD_PUBLISHABLE_KEY = 'sb_publishable_lmmK_HS10w-rYMyyiAfyeQ_65xBcN_8';

// The Google sign-in client (0.20), so teammates never paste anything. It's added at build time from the
// repository's GOOGLE_CLIENT_ID variable and GOOGLE_CLIENT_SECRET secret (Settings → Secrets and variables → Actions),
// so it never sits in the code on GitHub. Left empty, the app uses the Client ID and secret pasted on this PC, like before.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
