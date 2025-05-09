
import React, { createContext, useState, useContext, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
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

  useEffect(() => {
    // Check if there's a user session
    const checkSession = async () => {
      setIsLoading(true);
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error checking auth session:', error);
        setIsLoading(false);
        return;
      }
      
      if (session) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (userError || !userData) {
          console.error('Error fetching user data:', userError);
          setIsLoading(false);
          return;
        }
        
        setUser({
          id: userData.id,
          name: userData.name,
          isAuthenticated: true,
        });
      }
      
      setIsLoading(false);
    };
    
    checkSession();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (userError || !userData) {
          console.error('Error fetching user data:', userError);
          return;
        }
        
        setUser({
          id: userData.id,
          name: userData.name,
          isAuthenticated: true,
        });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async () => {
    setIsLoading(true);
    try {
      // Using the correct email for Sabrina
      const { error } = await supabase.auth.signInWithPassword({
        email: 'sabrina.orban@gmail.com',
        password: 'password123',
      });

      if (error) {
        throw error;
      }
      
      toast({
        title: 'Logged in',
        description: 'Successfully logged in as Sabrina',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to login',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setUser(null);
      
      toast({
        title: 'Logged out',
        description: 'Successfully logged out',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to logout',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
