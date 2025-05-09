
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Use the direct URL and key instead of environment variables
const supabaseUrl = "https://vdtogebrtoqnbbpjntgg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkdG9nZWJydG9xbmJicGpudGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MzQyMjgsImV4cCI6MjA2MjMxMDIyOH0.NWY5_4Qx2q7D3zkwoHrnTt4018ophmFxf9WA0j4_5U4";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
