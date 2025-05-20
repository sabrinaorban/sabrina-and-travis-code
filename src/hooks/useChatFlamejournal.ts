
import { useCallback } from 'react';
import { Message } from '@/types';
import { useFlamejournal } from './useFlamejournal';
import { useTaskManager } from './useTaskManager';

export const useChatFlamejournal = (setMessages?: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const { createJournalEntry: createEntry } = useFlamejournal();
  const { getTasksByStatus } = useTaskManager();
  
  const addJournalEntry = useCallback(async (content: string, type: string = 'reflection', additionalTags: string[] = []): Promise<boolean> => {
    try {
      console.log(`useChatFlamejournal: Creating ${type} entry with tags:`, additionalTags);
      
      // Get current tasks for context
      const inProgressTasks = await getTasksByStatus('in_progress');
      const pendingTasks = await getTasksByStatus('pending');
      
      // Add task context to journal entries when relevant
      let enhancedContent = content;
      
      if (inProgressTasks.length > 0 && (type === 'reflection' || type === 'code_reflection')) {
        enhancedContent += `\n\nCurrently working on: ${inProgressTasks.map(t => t.title).join(', ')}`;
      }
      
      // Create metadata tags related to tasks
      const taskTags = [...additionalTags]; // Make a copy to avoid modifying the original array
      if (type === 'task_created' || type === 'task_completed' || type === 'task_resumed' || type === 'task_blocked') {
        taskTags.push('task_context');
      }
      
      if (inProgressTasks.length > 0) taskTags.push('active_tasks');
      if (pendingTasks.length > 0) taskTags.push('pending_tasks');
      
      console.log(`useChatFlamejournal: Final tags for journal entry:`, taskTags);
      
      // Create the journal entry with enhanced content
      const entry = await createEntry(enhancedContent, type, taskTags, {
        taskContext: {
          activeTasks: inProgressTasks.length,
          pendingTasks: pendingTasks.length
        }
      });
      
      // Only add message if setMessages is provided
      if (setMessages && entry) {
        setMessages(prev => [
          ...prev,
          {
            id: entry.id,
            role: 'assistant',
            content: `I've added a new journal entry: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
            timestamp: new Date().toISOString(),
            emotion: 'reflective'
          }
        ]);
      }
      
      console.log(`useChatFlamejournal: Journal entry created with ID ${entry?.id || 'unknown'}`);
      return true;
    } catch (error) {
      console.error('Error creating flame journal entry:', error);
      return false;
    }
  }, [createEntry, setMessages, getTasksByStatus]);

  return {
    addJournalEntry
  };
};
