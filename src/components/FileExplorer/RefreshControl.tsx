
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RefreshControlProps {
  onRefresh: () => Promise<void>;
  isLoading: boolean;
}

export const RefreshControl: React.FC<RefreshControlProps> = ({
  onRefresh,
  isLoading
}) => {
  const handleRefresh = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;
    
    try {
      await onRefresh();
    } catch (error) {
      console.error("Failed to refresh files:", error);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleRefresh}
      disabled={isLoading}
      title="Refresh Files"
    >
      <RefreshCw size={16} className={cn(isLoading && "animate-spin")} />
    </Button>
  );
};

export default RefreshControl;
