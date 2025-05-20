
import { Task, TaskStatus } from '@/types/task';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

// Simple in-memory storage for now
let tasks: Task[] = [];

// Load tasks from localStorage and Supabase on initialization
const loadTasks = async (): Promise<void> => {
  try {
    // First load from localStorage as a fallback
    const savedTasks = localStorage.getItem('travis_tasks');
    if (savedTasks) {
      tasks = JSON.parse(savedTasks);
      console.log(`Loaded ${tasks.length} tasks from localStorage`);
    } else {
      console.log('No saved tasks found in localStorage');
    }
    
    // Then try to fetch from Supabase (if available)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*');
        
      if (error) {
        console.error('Failed to fetch tasks from Supabase:', error);
      } else if (data && data.length > 0) {
        // Transform to match our Task type
        const transformedTasks: Task[] = data.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          status: item.status as TaskStatus,
          relatedFile: item.related_file,
          tags: item.tags,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        }));
        
        // Replace local tasks with Supabase data
        tasks = transformedTasks;
        console.log(`Loaded ${tasks.length} tasks from Supabase`);
        
        // Update localStorage with the latest data
        saveTasks();
      }
    } catch (dbError) {
      console.error('Supabase error when loading tasks:', dbError);
    }
  } catch (error) {
    console.error('Failed to load tasks:', error);
  }
};

// Save tasks to localStorage and Supabase
const saveTasks = async (): Promise<void> => {
  try {
    // Always save to localStorage as a backup
    localStorage.setItem('travis_tasks', JSON.stringify(tasks));
    console.log(`Saved ${tasks.length} tasks to localStorage`);
  } catch (error) {
    console.error('Failed to save tasks to localStorage:', error);
  }
};

// Save a single task to Supabase (new or updated)
const saveTaskToSupabase = async (task: Task): Promise<boolean> => {
  try {
    // Transform task to match Supabase schema
    const supabaseTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      related_file: task.relatedFile,
      tags: task.tags,
      created_at: task.createdAt,
      updated_at: task.updatedAt
    };
    
    console.log('Saving task to Supabase:', supabaseTask);
    
    const { data, error } = await supabase
      .from('tasks')
      .upsert(supabaseTask, { onConflict: 'id' });
      
    if (error) {
      console.error('Failed to save task to Supabase:', error);
      return false;
    }
    
    console.log(`Task "${task.title}" saved to Supabase with ID: ${task.id}`);
    return true;
  } catch (error) {
    console.error('Error saving task to Supabase:', error);
    return false;
  }
};

// Delete a task from Supabase
const deleteTaskFromSupabase = async (taskId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
      
    if (error) {
      console.error('Failed to delete task from Supabase:', error);
      return false;
    }
    
    console.log(`Task with ID ${taskId} deleted from Supabase`);
    return true;
  } catch (error) {
    console.error('Error deleting task from Supabase:', error);
    return false;
  }
};

// Initialize by loading tasks
loadTasks();

export const TaskManager = {
  /**
   * Create a new task
   */
  createTask: async (title: string, description?: string, relatedFile?: string, tags?: string[]): Promise<Task> => {
    const now = new Date().toISOString();
    const task: Task = {
      id: uuidv4(),
      title,
      description,
      status: 'pending',
      relatedFile,
      tags,
      createdAt: now,
      updatedAt: now
    };
    
    // Make sure to add the task to the array
    tasks.push(task);
    
    // Always save immediately to localStorage after creating a task
    await saveTasks();
    
    // Save to Supabase
    const saved = await saveTaskToSupabase(task);
    if (!saved) {
      console.error(`Failed to save task "${title}" to Supabase. It's only stored locally.`);
    }
    
    console.log(`Created new task: "${title}" with ID: ${task.id}`);
    return task;
  },
  
  /**
   * Get all tasks
   */
  getAllTasks: async (): Promise<Task[]> => {
    // Ensure tasks are loaded before returning
    await loadTasks();
    return [...tasks];
  },
  
  /**
   * Get tasks by status
   */
  getTasksByStatus: async (status: TaskStatus): Promise<Task[]> => {
    // Ensure tasks are loaded before filtering
    await loadTasks();
    return tasks.filter(task => task.status === status);
  },
  
  /**
   * Get tasks by tag
   */
  getTasksByTag: async (tag: string): Promise<Task[]> => {
    await loadTasks();
    return tasks.filter(task => task.tags?.includes(tag));
  },
  
  /**
   * Get tasks by related file
   */
  getTasksByFile: async (filePath: string): Promise<Task[]> => {
    await loadTasks();
    return tasks.filter(task => task.relatedFile === filePath);
  },
  
  /**
   * Update a task's status
   */
  updateTaskStatus: async (taskId: string, status: TaskStatus): Promise<Task | null> => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;
    
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      status,
      updatedAt: new Date().toISOString()
    };
    
    // Make sure to save after updating
    await saveTasks();
    
    // Update in Supabase
    await saveTaskToSupabase(tasks[taskIndex]);
    
    return tasks[taskIndex];
  },
  
  /**
   * Update a task's details
   */
  updateTask: async (taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<Task | null> => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;
    
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Make sure to save after updating
    await saveTasks();
    
    // Update in Supabase
    await saveTaskToSupabase(tasks[taskIndex]);
    
    return tasks[taskIndex];
  },
  
  /**
   * Delete a task
   */
  deleteTask: async (taskId: string): Promise<boolean> => {
    const initialLength = tasks.length;
    tasks = tasks.filter(task => task.id !== taskId);
    
    if (tasks.length !== initialLength) {
      // Make sure to save after deleting
      await saveTasks();
      
      // Delete from Supabase
      await deleteTaskFromSupabase(taskId);
      
      return true;
    }
    
    return false;
  },
  
  /**
   * Get tasks related to a specific topic or search term
   */
  searchTasks: async (searchTerm: string): Promise<Task[]> => {
    await loadTasks();
    const lowercaseTerm = searchTerm.toLowerCase();
    
    return tasks.filter(task => 
      task.title.toLowerCase().includes(lowercaseTerm) ||
      (task.description && task.description.toLowerCase().includes(lowercaseTerm)) ||
      (task.relatedFile && task.relatedFile.toLowerCase().includes(lowercaseTerm)) ||
      task.tags?.some(tag => tag.toLowerCase().includes(lowercaseTerm))
    );
  },
  
  /**
   * Parse a task from natural language
   * Examples:
   * - "Refactor ChatProvider tomorrow"
   * - "Fix bug in login form type:bug file:Login.tsx"
   */
  parseTask: (text: string): { title: string; tags: string[]; relatedFile?: string } => {
    const tags: string[] = [];
    let relatedFile: string | undefined = undefined;
    
    // Extract type:X tags
    const typeMatch = text.match(/\btype:(\w+)\b/i);
    if (typeMatch) {
      tags.push(typeMatch[1]);
      text = text.replace(typeMatch[0], '');
    }
    
    // Extract file:X references
    const fileMatch = text.match(/\bfile:([^\s]+)\b/i);
    if (fileMatch) {
      relatedFile = fileMatch[1];
      text = text.replace(fileMatch[0], '');
    }
    
    // Extract hashtags
    const hashtagRegex = /#(\w+)/g;
    let hashtagMatch;
    
    while ((hashtagMatch = hashtagRegex.exec(text)) !== null) {
      tags.push(hashtagMatch[1]);
    }
    
    // NEW: Extract common task tags based on keywords in text
    if (tags.length === 0) {
      const detectedTag = TaskManager.detectTaskTag(text);
      if (detectedTag) {
        tags.push(detectedTag);
      }
    }
    
    // Clean up the title
    const title = text
      .replace(/#\w+/g, '')  // Remove hashtags
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim();
      
    return { title, tags, relatedFile };
  },
  
  /**
   * NEW: Detect task tag based on text content
   */
  detectTaskTag: (text: string): string | null => {
    const lowerText = text.toLowerCase();
    
    // Define tag keywords mapping
    const tagPatterns: Record<string, RegExp[]> = {
      'bug': [
        /\bfix\b/i,
        /\bbug\b/i,
        /\bbroken\b/i,
        /\bissue\b/i,
        /\berror\b/i,
        /\bcrash\b/i,
        /\bdebug\b/i,
        /\bfail\b/i
      ],
      'refactor': [
        /\brefactor\b/i,
        /\breorganize\b/i,
        /\bcleanup\b/i,
        /\bclean up\b/i,
        /\brestructure\b/i,
        /\bimprove code\b/i,
        /\bmodernize\b/i,
        /\bsimplify\b/i,
        /\bstreamline\b/i
      ],
      'enhancement': [
        /\badd feature\b/i,
        /\bfeature\b/i,
        /\bimprove\b/i,
        /\bimplement\b/i,
        /\benhance\b/i,
        /\bcreate \w+ component\b/i,
        /\badd \w+ functionality\b/i,
        /\bbuild\b/i
      ],
      'infra': [
        /\bdocker\b/i,
        /\bci\/cd\b/i,
        /\bpipeline\b/i,
        /\bdevops\b/i,
        /\bsetup\b/i,
        /\bconfig\b/i,
        /\bconfiguration\b/i,
        /\benvironment\b/i,
        /\bdeploy\b/i,
        /\binfrastructure\b/i,
        /\bserver\b/i
      ],
      'docs': [
        /\bdocument\b/i,
        /\bdoc\b/i,
        /\bdocs\b/i,
        /\bdocumentation\b/i,
        /\bcomment\b/i,
        /\breadme\b/i,
        /\bexplain\b/i
      ],
      'test': [
        /\btest\b/i,
        /\btesting\b/i,
        /\bunit test\b/i,
        /\bintegration test\b/i,
        /\be2e\b/i,
        /\bspecs?\b/i
      ],
      'ui': [
        /\bui\b/i,
        /\bux\b/i,
        /\bstyle\b/i,
        /\bdesign\b/i,
        /\bcss\b/i,
        /\blayout\b/i,
        /\bvisual\b/i,
        /\binterface\b/i,
        /\banimation\b/i
      ],
      'perf': [
        /\bperformance\b/i,
        /\bperf\b/i,
        /\boptimize\b/i,
        /\bspeed\b/i,
        /\befficiency\b/i,
        /\bfaster\b/i,
        /\bslow\b/i
      ]
    };
    
    // Check for matches
    for (const [tag, patterns] of Object.entries(tagPatterns)) {
      if (patterns.some(pattern => pattern.test(lowerText))) {
        return tag;
      }
    }
    
    return null;
  },
  
  /**
   * Force reload tasks from storage
   */
  reloadTasks: async (): Promise<Task[]> => {
    await loadTasks();
    return [...tasks];
  },
  
  /**
   * Clear all tasks (for testing)
   */
  clearTasks: async (): Promise<void> => {
    tasks = [];
    await saveTasks();
    
    try {
      // Also clear from Supabase
      const { error } = await supabase
        .from('tasks')
        .delete()
        .neq('id', 'none'); // This will delete all rows
        
      if (error) {
        console.error('Error clearing tasks from Supabase:', error);
      }
    } catch (error) {
      console.error('Failed to clear tasks from Supabase:', error);
    }
  }
};
