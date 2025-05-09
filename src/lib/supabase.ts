
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Use the direct URL and key instead of environment variables
const supabaseUrl = "https://vdtogebrtoqnbbpjntgg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkdG9nZWJydG9xbmJicGpudGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MzQyMjgsImV4cCI6MjA2MjMxMDIyOH0.NWY5_4Qx2q7D3zkwoHrnTt4018ophmFxf9WA0j4_5U4";

// Export a single instance of the supabase client to be used everywhere
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Debug listener for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Global auth state change:', event, session?.user?.id);
});

// Generate a proper UUID for Supabase
export const generateUUID = (): string => {
  return crypto.randomUUID();
};

// Helper function to create or get a user profile
export const getOrCreateUserProfile = async (userId: string, email?: string): Promise<any> => {
  try {
    // First check if user exists in the users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (fetchError) {
      console.error('Error checking for existing user:', fetchError);
      throw fetchError;
    }
    
    // If user exists, return it
    if (existingUser) {
      console.log('Found existing user profile:', existingUser);
      return existingUser;
    }
    
    // If no user exists, create one
    console.log('Creating new user profile for:', userId, email);
    const name = email ? email.split('@')[0] : 'User';
    
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        { 
          id: userId, 
          name: name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
      
    if (insertError) {
      console.error('Error creating user profile:', insertError);
      throw insertError;
    }
    
    console.log('Created new user profile:', newUser);
    return newUser;
  } catch (err) {
    console.error('Error in getOrCreateUserProfile:', err);
    // Return a default user object to prevent app from breaking
    return { id: userId, name: email ? email.split('@')[0] : 'Guest', isAuthenticated: true };
  }
};
