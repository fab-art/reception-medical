import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// createClient() throws synchronously if the URL is missing/invalid. That
// used to crash the whole app before React could even render a single pixel
// whenever VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY weren't set at build
// time (e.g. deployed to Vercel without the env vars configured in the
// project settings) - the browser just showed a blank white page with no
// visible error. We now catch that and fall back to a stub client so the
// app boots, runs off its local/offline cache, and shows a clear on-screen
// warning (see App.jsx) instead of silently failing.
export const supabaseConfigured = Boolean(url && anonKey);

function makeStubClient() {
  const error = { message: 'Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).' };
  const chain = {
    select: async () => ({ data: null, error }),
    insert: async () => ({ data: null, error }),
    update: () => ({ eq: async () => ({ data: null, error }) }),
    delete: () => ({ eq: async () => ({ data: null, error }) }),
    upsert: async () => ({ data: null, error }),
    eq: async () => ({ data: null, error }),
    maybeSingle: async () => ({ data: null, error }),
  };
  return { from: () => chain };
}

let client;
try {
  if (!supabaseConfigured) {
    // eslint-disable-next-line no-console
    console.warn(
      '[RSSB Reception] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'The app will run in local-only mode until these are set (see DEPLOY.md). ' +
      'On Vercel these must be added under Project Settings -> Environment Variables, ' +
      'not just in a local .env file, then redeployed so the build can inline them.'
    );
    client = makeStubClient();
  } else {
    client = createClient(url, anonKey);
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('[RSSB Reception] Failed to initialize Supabase client:', err);
  client = makeStubClient();
}

export const supabase = client;
