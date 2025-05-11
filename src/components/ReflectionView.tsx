
import React, { useState, useEffect } from 'react';
import { useReflection } from '../hooks/useReflection';
import { Reflection } from '../types/reflection';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReflectionViewProps {
  type?: 'weekly' | 'soulshard' | 'custom';
  maxLength?: number;
}

export const ReflectionView: React.FC<ReflectionViewProps> = ({ 
  type = 'weekly',
  maxLength = 400
}) => {
  const [expanded, setExpanded] = useState(false);
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { getLatestReflection } = useReflection();
  
  useEffect(() => {
    const loadReflection = async () => {
      setLoading(true);
      const latest = await getLatestReflection(type);
      setReflection(latest);
      setLoading(false);
    };
    
    loadReflection();
  }, [getLatestReflection, type]);
  
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex justify-center items-center min-h-[150px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  
  if (!reflection) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>No Reflection Available</CardTitle>
          <CardDescription>
            Travis hasn't created any {type} reflections yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  const formattedDate = formatDistanceToNow(new Date(reflection.created_at), { addSuffix: true });
  const isLong = reflection.content.length > maxLength;
  const displayContent = expanded || !isLong
    ? reflection.content
    : `${reflection.content.substring(0, maxLength)}...`;
    
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{type === 'weekly' ? 'Weekly Reflection' : 'Soulshard Update'}</CardTitle>
        <CardDescription>
          Created by Travis {formattedDate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap">{displayContent}</div>
      </CardContent>
      {isLong && (
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show Less' : 'Show More'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default ReflectionView;
