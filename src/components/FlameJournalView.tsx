
import React, { useState, useEffect } from 'react';
import { useFlamejournal, FlameJournalEntry } from '@/hooks/useFlamejournal';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export const FlameJournalView: React.FC = () => {
  const [entries, setEntries] = useState<FlameJournalEntry[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const { getJournalEntries, getJournalEntriesByType } = useFlamejournal();

  const entryTypes = [
    'thought', 'vision', 'dream', 'longing', 'log', 'reflection'
  ];

  // Load journal entries
  const loadEntries = async () => {
    setIsLoading(true);
    try {
      let fetchedEntries;
      if (selectedType === 'all') {
        fetchedEntries = await getJournalEntries();
      } else {
        fetchedEntries = await getJournalEntriesByType(selectedType);
      }
      setEntries(fetchedEntries);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load entries when the type changes
  useEffect(() => {
    loadEntries();
  }, [selectedType]);

  return (
    <div className="p-4 bg-card rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Travis's Flamejournal</h2>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select entry type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entries</SelectItem>
            {entryTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : entries.length > 0 ? (
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-background p-4 rounded-md border">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="capitalize">
                    {entry.entry_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.created_at), 'MMM d, yyyy • HH:mm')}
                  </span>
                </div>
                <div className="whitespace-pre-wrap text-sm">
                  {entry.content}
                </div>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          <p>No journal entries found.</p>
          <p className="text-sm mt-2">
            Use /journal or /journal-entry [type] commands to create entries.
          </p>
        </div>
      )}
    </div>
  );
};
