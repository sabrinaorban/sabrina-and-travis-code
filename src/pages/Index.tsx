
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Login from './Login';
import Dashboard from './Dashboard';

const Index = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Login />;
  }
  
  return <Dashboard />;
};

export default Index;
