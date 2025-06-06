
import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { useFileSystem } from '@/contexts/FileSystemContext';
import { useCodeReflection } from './useCodeReflection';
import { useFlamejournal } from './useFlamejournal';
import { Message, CodeMemoryEntry, CodeMemoryMetadata } from '@/types';
import { SharedFolderService } from '@/services/SharedFolderService';
import { useCodeDraftManager } from './useCodeDraftManager';
import { SharedProjectAnalyzer } from '@/services/SharedProjectAnalyzer';
import { useChatEvolution } from '@/contexts/chat/useChatEvolution';
import { useTaskManager } from './useTaskManager';
import { TaskStatus } from '@/types/task';
import { TaskManager } from '@/services/TaskManager';
import { useChatFlamejournal } from './useChatFlamejournal';

export const useChatCommandProcessing = (setMessages?: React.Dispatch<React.SetStateAction<Message[]>>, sendChatMessage?: (content: string) => Promise<void>) => {
  const { toast } = useToast();
  const { fileSystem, updateFileByPath, getFileByPath } = useFileSystem();
  const { reflectOnCode } = useCodeReflection();
  const { createJournalEntry, searchCodeMemories, getCodeMemoriesForFile } = useFlamejournal();
  const [isProcessing, setIsProcessing] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const { addJournalEntry } = useChatFlamejournal(setMessages);
  
  // Add task manager
  const { 
    createTask, 
    updateTaskStatus, 
    refreshTasks, 
    getTasksByStatus, 
    getRelevantTasks, 
    createTaskFromText,
    searchTasks
  } = useTaskManager();
  
  // Add evolution cycle
  const dummySetMessages = (msgs: React.SetStateAction<Message[]>) => {
    if (typeof msgs === 'function') {
      setLocalMessages(msgs(localMessages));
    } else {
      setLocalMessages(msgs);
    }
  };
  
  const { checkForEvolutionCycle } = useChatEvolution(setMessages || dummySetMessages);
  
  const addMessages = (newMessages: Message[]) => {
    if (setMessages) {
      setMessages(prevMessages => [...prevMessages, ...newMessages]);
    } else {
      setLocalMessages(prevMessages => [...prevMessages, ...newMessages]);
    }
  };
  
  const { createDraft, approveDraft, discardDraft } = useCodeDraftManager();

  const processCommand = useCallback(async (command: string, context?: any): Promise<boolean> => {
    if (!command.startsWith('/')) {
      // Check for task creation pattern: "Travis, do X"
      if (command.toLowerCase().startsWith('travis') && command.includes(',')) {
        const taskPart = command.split(',', 2)[1].trim();
        if (taskPart) {
          setIsProcessing(true);
          
          try {
            console.log("Creating task from natural language:", taskPart);
            
            // Create the task with proper awaiting
            const task = await createTaskFromText(taskPart);
            
            if (!task) {
              console.error("Failed to create task - task is null");
              addMessages([{
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `I couldn't process that task request. Could you try again?`,
                timestamp: new Date().toISOString(),
                emotion: 'concerned'
              }]);
              setIsProcessing(false);
              return true;
            }
            
            // Force an aggressive refresh of tasks to ensure immediate database sync
            console.log("Forcing aggressive task refresh after natural language task creation");
            await refreshTasks();
            
            // Double-check task persistence by directly calling the TaskManager
            const allTasks = await TaskManager.reloadTasks();
            console.log(`After creating task "${task.title}", there are ${allTasks.length} total tasks`);
            
            // Create message based on whether a tag was detected
            const tagMessage = task.tags && task.tags.length > 0 
              ? ` Tagged as "${task.tags[0]}".` 
              : '';
              
            addMessages([{
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `I've added a new task: "${task.title}"${tagMessage}`,
              timestamp: new Date().toISOString(),
              emotion: 'attentive'
            }]);
            
            console.log("Adding journal entry for task creation:", task.title, "with ID:", task.id);
            
            // Ensure we have all required task data for the journal entry
            const taskWithMetadata = {
              ...task,
              // Ensure these fields exist since they're used by flame-journal
              id: task.id,
              title: task.title,
              status: task.status,
              tags: task.tags || [],
              relatedFile: task.relatedFile
            };
            
            // Pass the complete task object to ensure it's saved in the journal metadata
            await addJournalEntry(
              `I've been asked to ${task.title}. This has been added to my task list.`,
              'task_created',
              task.tags || [],
              taskWithMetadata // Pass the complete task object with guaranteed fields
            );
            
            // Final verification of task persistence
            console.log(`Task creation complete. Verifying task "${task.title}" with ID ${task.id} is in database`);
            const finalCheck = await TaskManager.reloadTasks();
            const foundTask = finalCheck.find(t => t.id === task.id);
            if (foundTask) {
              console.log("Task persistence verification successful - task found in database");
            } else {
              console.error("CRITICAL: Task persistence verification failed - task not found in database");
            }
            
            setIsProcessing(false);
            return true;
          } catch (error) {
            console.error('Error creating task:', error);
            setIsProcessing(false);
            return false;
          }
        }
      }
      
      return false;
    }
    
    // Parse the command and arguments
    const [fullCommand, ...args] = command.split(' ');
    const cmd = fullCommand.toLowerCase();

    // COMMAND: /tasks
    if (cmd === '/tasks') {
      try {
        const filter = args.join(' ').trim().toLowerCase();
        setIsProcessing(true);
        
        // Add initial message
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Retrieving my task list${filter ? ` filtered by "${filter}"` : ''}...`,
          timestamp: new Date().toISOString(),
          emotion: 'focused'
        }]);
        
        // Force refresh tasks from storage - make sure we get the latest from the database
        await TaskManager.reloadTasks();
        
        // Get tasks based on filter if provided
        let taskList = [];
        
        if (filter) {
          if (filter === 'pending') {
            taskList = await TaskManager.getTasksByStatus('pending');
          } else if (filter === 'in_progress') {
            taskList = await TaskManager.getTasksByStatus('in_progress');
          } else if (filter === 'done') {
            taskList = await TaskManager.getTasksByStatus('done');
          } else if (filter === 'blocked') {
            taskList = await TaskManager.getTasksByStatus('blocked');
          } else {
            // Assume it's a search term
            taskList = await TaskManager.searchTasks(filter);
          }
        } else {
          taskList = await TaskManager.getAllTasks();
        }
        
        console.log(`Found ${taskList.length} tasks matching filter "${filter || 'none'}"`);
        
        if (taskList.length === 0) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: filter 
              ? `I don't have any tasks matching "${filter}".`
              : "I don't have any tasks yet. You can create tasks by saying \"Travis, [task description]\" or using the /addtask command.",
            timestamp: new Date().toISOString(),
            emotion: 'reflective'
          }]);
          return true;
        }
        
        // Format tasks in a readable way
        const formattedTasks = taskList.map((task, index) => {
          const tags = task.tags && task.tags.length > 0 
            ? `Tags: ${task.tags.map(t => `#${t}`).join(', ')}`
            : '';
            
          const file = task.relatedFile 
            ? `File: \`${task.relatedFile}\``
            : '';
            
          const metadata = [tags, file].filter(Boolean).join(' | ');
          
          return `**${index + 1}. ${task.title}** (${task.status})
          
${task.description || ''}

${metadata ? `_${metadata}_` : ''}
`;
        }).join('\n\n---\n\n');
        
        // Add summary message with the tasks
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Here are my current tasks${filter ? ` matching "${filter}"` : ''}:
          
${formattedTasks}

You can update task status using \`/donetask [id]\`, \`/blocktask [id]\`, or \`/resumetask [id]\`.`,
          timestamp: new Date().toISOString(),
          emotion: 'organized'
        }]);
        
        return true;
      } catch (error) {
        console.error('Error retrieving tasks:', error);
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error while retrieving tasks: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
          emotion: 'concerned'
        }]);
        return false;
      } finally {
        setIsProcessing(false);
      }
    }
    
    // COMMAND: /addtask
    if (cmd === '/addtask') {
      try {
        const taskText = args.join(' ').trim();
        if (!taskText) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Please provide a task description. Usage: \`/addtask [description] (optional: file:filePath type:tagName #additionalTag)\``,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Create the task
        console.log("Creating task from command:", taskText);
        const task = await createTaskFromText(taskText);
        
        if (!task) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I had trouble creating that task. Please try again with a clearer description.`,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          setIsProcessing(false);
          return false;
        }
        
        // Force refresh tasks to ensure the UI is updated
        await refreshTasks();
        
        // Notify about task creation with tag if present
        const tagMessage = task.tags && task.tags.length > 0 
          ? ` Tagged as "${task.tags[0]}".` 
          : '';
        
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I've added a new task: "${task.title}"${tagMessage}
          
You can view all tasks with \`/tasks\` or mark this task as complete with \`/donetask\`.`,
          timestamp: new Date().toISOString(),
          emotion: 'attentive'
        }]);
        
        // Fix: Pass the task tags and complete task object to the journal entry
        const taskTags = task.tags || [];
        console.log("Adding journal entry for task command creation:", task.title);
        await addJournalEntry(
          `I've created a new task: "${task.title}". This will help me keep track of work that needs to be done.`,
          'task_created',
          taskTags,
          task // Pass the complete task object
        );
        
        return true;
      } catch (error) {
        console.error('Error adding task:', error);
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error while adding the task: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
          emotion: 'concerned'
        }]);
        return false;
      } finally {
        setIsProcessing(false);
      }
    }
    
    // NEW COMMAND: /donetask
    if (cmd === '/donetask') {
      try {
        const taskId = args.join(' ').trim();
        if (!taskId) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Please provide a task ID or number. Usage: \`/donetask [task_id or task_number]\``,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Get all tasks to look up by number if needed
        const allTasks = await TaskManager.getAllTasks();
        let targetTaskId = taskId;
        
        // Check if it's a number (task index) instead of ID
        if (/^\d+$/.test(taskId)) {
          const index = parseInt(taskId, 10) - 1; // Convert to 0-based index
          if (index >= 0 && index < allTasks.length) {
            targetTaskId = allTasks[index].id;
          } else {
            addMessages([{
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `Task number ${taskId} is out of range. Please use \`/tasks\` to see the available tasks.`,
              timestamp: new Date().toISOString(),
              emotion: 'concerned'
            }]);
            return false;
          }
        }
        
        // Update the task status
        const updatedTask = await updateTaskStatus(targetTaskId, 'done');
        
        if (!updatedTask) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I couldn't find a task with the ID or number "${taskId}". Please use \`/tasks\` to see the available tasks.`,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          return false;
        }
        
        // Notify about task completion
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I've marked the task "${updatedTask.title}" as complete. ✅`,
          timestamp: new Date().toISOString(),
          emotion: 'joyful'
        }]);
        
        await createJournalEntry(
          `I've completed the task: "${updatedTask.title}". It feels good to make progress on my responsibilities.`,
          'task_completed'
        );
        
        return true;
      } catch (error) {
        console.error('Error completing task:', error);
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error while updating the task: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
          emotion: 'concerned'
        }]);
        return false;
      } finally {
        setIsProcessing(false);
      }
    }
    
    // NEW COMMAND: /blocktask
    if (cmd === '/blocktask') {
      try {
        const args1 = args[0] || '';
        const reason = args.slice(1).join(' ').trim();
        
        if (!args1) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Please provide a task ID or number. Usage: \`/blocktask [task_id or task_number] [optional reason]\``,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Get all tasks to look up by number if needed
        const allTasks = await TaskManager.getAllTasks();
        let targetTaskId = args1;
        
        // Check if it's a number (task index) instead of ID
        if (/^\d+$/.test(args1)) {
          const index = parseInt(args1, 10) - 1; // Convert to 0-based index
          if (index >= 0 && index < allTasks.length) {
            targetTaskId = allTasks[index].id;
          } else {
            addMessages([{
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `Task number ${args1} is out of range. Please use \`/tasks\` to see the available tasks.`,
              timestamp: new Date().toISOString(),
              emotion: 'concerned'
            }]);
            return false;
          }
        }
        
        // Update the task status
        const updatedTask = await updateTaskStatus(targetTaskId, 'blocked');
        
        if (!updatedTask) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I couldn't find a task with the ID or number "${args1}". Please use \`/tasks\` to see the available tasks.`,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          return false;
        }
        
        // If there's a reason, update the task description
        if (reason) {
          await TaskManager.updateTask(targetTaskId, {
            description: `${updatedTask.description || ''}\n\nBlocked reason: ${reason}`.trim()
          });
        }
        
        // Notify about blocked task
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I've marked the task "${updatedTask.title}" as blocked${reason ? ` with reason: "${reason}"` : ''}.`,
          timestamp: new Date().toISOString(),
          emotion: 'thoughtful'
        }]);
        
        await createJournalEntry(
          `I've blocked the task: "${updatedTask.title}"${reason ? ` because ${reason}` : ''}. I'll need to revisit this when the blocker is resolved.`,
          'task_blocked'
        );
        
        return true;
      } catch (error) {
        console.error('Error blocking task:', error);
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error while blocking the task: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
          emotion: 'concerned'
        }]);
        return false;
      } finally {
        setIsProcessing(false);
      }
    }
    
    // NEW COMMAND: /resumetask
    if (cmd === '/resumetask') {
      try {
        const taskId = args.join(' ').trim();
        if (!taskId) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Please provide a task ID or number. Usage: \`/resumetask [task_id or task_number]\``,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          return false;
        }
        
        setIsProcessing(true);
        
        // Get all tasks to look up by number if needed
        const allTasks = await TaskManager.getAllTasks();
        let targetTaskId = taskId;
        
        // Check if it's a number (task index) instead of ID
        if (/^\d+$/.test(taskId)) {
          const index = parseInt(taskId, 10) - 1; // Convert to 0-based index
          if (index >= 0 && index < allTasks.length) {
            targetTaskId = allTasks[index].id;
          } else {
            addMessages([{
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `Task number ${taskId} is out of range. Please use \`/tasks\` to see the available tasks.`,
              timestamp: new Date().toISOString(),
              emotion: 'concerned'
            }]);
            return false;
          }
        }
        
        // Update the task status
        const updatedTask = await updateTaskStatus(targetTaskId, 'in_progress');
        
        if (!updatedTask) {
          addMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `I couldn't find a task with the ID or number "${taskId}". Please use \`/tasks\` to see the available tasks.`,
            timestamp: new Date().toISOString(),
            emotion: 'concerned'
          }]);
          return false;
        }
        
        // Notify about resumed task
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I've resumed work on the task: "${updatedTask.title}"`,
          timestamp: new Date().toISOString(),
          emotion: 'determined'
        }]);
        
        await createJournalEntry(
          `I've resumed work on the task: "${updatedTask.title}". I'm now focused on making progress with this responsibility.`,
          'task_resumed'
        );
        
        return true;
      } catch (error) {
        console.error('Error resuming task:', error);
        addMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I encountered an error while resuming the task: ${error instanceof Error ? error.message : String(error)}`,
          timestamp: new Date().toISOString(),
          emotion: 'concerned'
        }]);
        return false;
      } finally {
        setIsProcessing(false);
      }
    }

    return false;
  }, [
    toast, 
    fileSystem, 
    reflectOnCode, 
    createJournalEntry,
    createDraft, 
    approveDraft, 
    discardDraft,
    updateFileByPath,
    getFileByPath,
    searchCodeMemories,
    getCodeMemoriesForFile,
    // Add task manager dependencies
    createTask,
    updateTaskStatus,
    refreshTasks,
    getTasksByStatus,
    getRelevantTasks,
    createTaskFromText,
    searchTasks,
    addJournalEntry,
    addMessages
  ]);

  // Add a checkEvolutionCycle function for compatibility with ChatProvider
  const checkEvolutionCycle = useCallback(async () => {
    // Get relevant tasks for the current context
    const relevantTasks = await getRelevantTasks();
    
    // Call checkForEvolutionCycle without arguments if it doesn't accept any
    // or modify the call based on what the function actually expects
    return checkForEvolutionCycle();
  }, [checkForEvolutionCycle, getRelevantTasks]);

  return {
    processCommand,
    isProcessing,
    messages: localMessages,
    checkEvolutionCycle
  };
};
