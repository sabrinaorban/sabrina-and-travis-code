
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Login from './Login';
import Dashboard from './Dashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, isLoading } = useAuth();
  const [authTimeout, setAuthTimeout] = useState(false);
  
  // Enhanced debugging
  useEffect(() => {
    console.log('Index render - Auth state:', { user, isLoading });
    
    // Add timeout to ensure we're not stuck in a loading state
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.log('Loading timeout reached - may indicate an issue with auth flow');
        setAuthTimeout(true);
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [user, isLoading]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen justify-center items-center">
        <Loader2 className="h-10 w-10 animate-spin text-travis mb-4" />
        <p className="text-gray-500">Authenticating...</p>
        {authTimeout && (
          <div className="mt-4 text-center">
            <p className="text-amber-600">Authentication is taking longer than expected.</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
            >
              Refresh Page
            </button>
          </div>
        )}
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
