// your-nextjs-project/utils/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

// Ensure these environment variables are loaded
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Check your .env.local file.");
  // In a real app, you might want to throw an error or handle this more gracefully
}

export const supabase = createClient(
  supabaseUrl!, // The '!' asserts that you know they won't be null/undefined at runtime
  supabaseAnonKey!
);

// This client instance is suitable for both client components and API routes
// For server components or server actions where cookies are involved for auth,
// Supabase recommends using their @supabase/ssr package, but for this simple
// insert/read and realtime setup, this is sufficient.