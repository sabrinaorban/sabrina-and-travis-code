
import React, { useState } from 'react';
import { useGitHub } from '@/contexts/GitHubContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Github, LogOut } from 'lucide-react';

export const GitHubAuth: React.FC = () => {
  const { authState, authenticate, logout } = useGitHub();
  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    
    setIsConnecting(true);
    try {
      await authenticate(token);
    } finally {
      setIsConnecting(false);
      setToken('');
    }
  };

  if (authState.isAuthenticated) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
        <Github className="h-5 w-5" />
        <div className="flex-grow">
          <p className="font-medium">Connected as {authState.username}</p>
          <p className="text-sm text-muted-foreground">Your GitHub account is connected</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-1" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          Connect to GitHub
        </CardTitle>
        <CardDescription>
          Connect your GitHub account to browse and edit your repositories
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">
                Create a Personal Access Token with <strong>repo</strong> scope:
              </p>
              <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-1">
                <li>Go to GitHub Settings &gt; Developer settings &gt; Personal access tokens &gt; Tokens (classic)</li>
                <li>Click "Generate new token" and select "classic"</li>
                <li>Give it a name and select the "repo" scope</li>
                <li>Click "Generate token" and copy it below</li>
              </ol>
            </div>
            <Input
              type="password"
              placeholder="GitHub Personal Access Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
            {authState.error && (
              <div className="text-sm text-red-500">{authState.error}</div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            disabled={isConnecting || authState.loading}
            className="w-full"
          >
            {(isConnecting || authState.loading) ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Github className="h-4 w-4 mr-2" />
                Connect to GitHub
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
