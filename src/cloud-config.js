// Your Supabase project, built into the app so a new PC only needs to sign in.
// Both values are safe to ship: the publishable key can only do what the security rules in
// supabase/setup.sql and supabase/teams-0.20.sql allow. Never put the secret key here.
export const CLOUD_URL = 'https://oiykeulhakbjlwsaxmad.supabase.co';
export const CLOUD_PUBLISHABLE_KEY = 'sb_publishable_lmmK_HS10w-rYMyyiAfyeQ_65xBcN_8';

// The Google sign-in client (0.20), built in so teammates never paste anything. A desktop app's
// client secret isn't really secret (Google says so for installed apps), so it's fine to ship.
// Left empty, the app uses the Client ID and secret pasted on this PC, like before.
export const GOOGLE_CLIENT_ID = '';
export const GOOGLE_CLIENT_SECRET = '';
