
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabaseKey = supabaseAnonKey; // Export separately for edge functions

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
