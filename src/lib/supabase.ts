import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabaseKey = supabaseAnonKey; // Export separately for edge functions

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Generate a UUID
export const generateUUID = (): string => {
  return uuidv4();
};

// Get or create a user profile
export const getOrCreateUserProfile = async (
  userId: string,
  email?: string
): Promise<any> => {
  try {
    // First, check if user profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', fetchError);
      throw fetchError;
    }

    // If profile exists, return it
    if (existingProfile) {
      console.log('Found existing user profile:', existingProfile);
      return existingProfile;
    }

    // Otherwise create a new profile
    console.log('Creating new user profile for:', userId);
    
    const name = email ? email.split('@')[0] : 'User';
    
    const { data: newProfile, error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        name,
        email,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating user profile:', insertError);
      throw insertError;
    }

    return newProfile;
  } catch (error) {
    console.error('Error in getOrCreateUserProfile:', error);
    throw error;
  }
};
