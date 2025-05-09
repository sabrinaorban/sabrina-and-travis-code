
import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '../types';
import { supabase, getOrCreateUserProfile } from '../lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Improved authentication state handling
  useEffect(() => {
    console.log('AuthProvider: Setting up auth state listener and checking session');
    
    // First set up the auth listener to catch changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (session?.user) {
          // Use setTimeout to avoid potential deadlocks with Supabase client
          setTimeout(async () => {
            try {
              const email = session.user.email;
              const userData = await getOrCreateUserProfile(session.user.id, email);
                
              if (userData) {
                setUser({
                  id: userData.id,
                  name: userData.name,
                  isAuthenticated: true,
                });
                console.log('User authenticated successfully:', userData);
              }
              
              setIsLoading(false);
            } catch (err) {
              console.error('Error in auth state change handler:', err);
              setIsLoading(false);
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing state');
          setUser(null);
          setIsLoading(false);
        }
      }
    );
    
    // Then check for an existing session
    const checkSession = async () => {
      try {
        console.log('Checking for existing session');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking auth session:', error);
          setIsLoading(false);
          return;
        }
        
        if (!session) {
          console.log('No active session found');
          setIsLoading(false);
          return;
        }
        
        console.log('Found existing session, fetching user data');
        try {
          const email = session.user.email;
          const userData = await getOrCreateUserProfile(session.user.id, email);
          
          if (userData) {
            setUser({
              id: userData.id,
              name: userData.name,
              isAuthenticated: true,
            });
            console.log('User authenticated from existing session:', userData);
          }
        } catch (userError) {
          console.error('Error processing user data:', userError);
        } finally {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Unexpected error during auth check:', err);
        setIsLoading(false);
      }
    };
    
    checkSession();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async () => {
    setIsLoading(true);
    try {
      console.log('Attempting to log in');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'sabrina.orban@gmail.com',
        password: 'password123',
      });

      if (error) {
        throw error;
      }
      
      console.log('Login successful:', data);
      
      toast({
        title: 'Logged in',
        description: 'Successfully logged in as Sabrina',
      });
      
      // Auth state listener will handle updating the user state
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to login',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      console.log('Attempting to log out');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      // Clear user state immediately for better UX
      setUser(null);
      
      toast({
        title: 'Logged out',
        description: 'Successfully logged out',
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to logout',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Debug output to help diagnose issues
  useEffect(() => {
    console.log('Current auth state:', { user, isLoading });
  }, [user, isLoading]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
