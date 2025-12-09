import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasRealtimeEnv = Boolean(supabaseUrl && supabaseAnonKey);

// Supabase is used only for realtime fan-out; Prisma remains the source of truth.
export const supabaseClient = hasRealtimeEnv
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: { persistSession: false },
    })
  : null;
