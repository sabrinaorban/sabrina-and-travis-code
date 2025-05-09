
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Login from './Login';
import Dashboard from './Dashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, isLoading } = useAuth();
  
  // Enhanced debugging
  useEffect(() => {
    console.log('Index render - Auth state:', { user, isLoading });
    
    // Add timeout to ensure we're not stuck in a loading state
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.log('Loading timeout reached - may indicate an issue with auth flow');
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [user, isLoading]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen justify-center items-center">
        <Loader2 className="h-10 w-10 animate-spin text-travis mb-4" />
        <p className="text-gray-500">Authenticating...</p>
        <p className="text-xs text-gray-400 mt-2">
          (If stuck here for more than 10 seconds, try refreshing the page)
        </p>
      </div>
    );
  }
  
  if (!user) {
    console.log('No user found, showing login page');
    return <Login />;
  }
  
  console.log('User authenticated, showing dashboard');
  return <Dashboard />;
};

export default Index;
