
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Login from './Login';
import Dashboard from './Dashboard';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, isLoading } = useAuth();
  
  // Add debugging
  useEffect(() => {
    console.log('Auth state:', { user, isLoading });
  }, [user, isLoading]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen justify-center items-center">
        <Loader2 className="h-10 w-10 animate-spin text-travis mb-4" />
        <p className="text-gray-500">Authenticating...</p>
      </div>
    );
  }
  
  if (!user) {
    return <Login />;
  }
  
  return <Dashboard />;
};

export default Index;
