
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const AuthForm: React.FC = () => {
  const { login } = useAuth();
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/20">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Welcome to Travis</CardTitle>
          <CardDescription>
            Your AI development assistant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={login} 
            className="w-full bg-travis hover:bg-travis/90"
          >
            Sign in as Sabrina
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
