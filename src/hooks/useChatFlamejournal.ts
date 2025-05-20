
import { useCallback } from 'react';
import { Message } from '@/types';
import { useFlamejournal } from './useFlamejournal';
import { useTaskManager } from './useTaskManager';

export const useChatFlamejournal = (setMessages?: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const { createJournalEntry: createEntry } = useFlamejournal();
  const { getTasksByStatus } = useTaskManager();
  
  const addJournalEntry = useCallback(async (content: string, type: string = 'reflection', additionalTags: string[] = []): Promise<boolean> => {
    try {
      // Get current tasks for context
      const inProgressTasks = getTasksByStatus('in_progress');
      const pendingTasks = getTasksByStatus('pending');
      
      // Add task context to journal entries when relevant
      let enhancedContent = content;
      
      if (inProgressTasks.length > 0 && (type === 'reflection' || type === 'code_reflection')) {
        enhancedContent += `\n\nCurrently working on: ${inProgressTasks.map(t => t.title).join(', ')}`;
      }
      
      // Create metadata tags related to tasks
      const taskTags = ['task_context', ...additionalTags];
      if (inProgressTasks.length > 0) taskTags.push('active_tasks');
      if (pendingTasks.length > 0) taskTags.push('pending_tasks');
      
      // Create the journal entry with enhanced content
      // Make sure we're using the correct signature for createEntry:
      // content, type, tags, metadata - where metadata is a separate object, not part of tags
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
