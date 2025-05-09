
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const AuthForm: React.FC = () => {
  const { login, isLoading } = useAuth();
  
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
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in as Sabrina"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
