import { Task, TaskStatus } from '@/types/task';
import { v4 as uuidv4 } from 'uuid';

// Simple in-memory storage for now
let tasks: Task[] = [];

// Load tasks from localStorage on initialization
const loadTasks = (): void => {
  try {
    const savedTasks = localStorage.getItem('travis_tasks');
    if (savedTasks) {
      tasks = JSON.parse(savedTasks);
      console.log(`Loaded ${tasks.length} tasks from storage`);
    } else {
      console.log('No saved tasks found in storage');
    }
  } catch (error) {
    console.error('Failed to load tasks from storage:', error);
  }
};

// Save tasks to localStorage
const saveTasks = (): void => {
  try {
    localStorage.setItem('travis_tasks', JSON.stringify(tasks));
    console.log(`Saved ${tasks.length} tasks to storage`);
  } catch (error) {
    console.error('Failed to save tasks to storage:', error);
  }
};

// Initialize by loading tasks
loadTasks();

export const TaskManager = {
  /**
   * Create a new task
   */
  createTask: (title: string, description?: string, relatedFile?: string, tags?: string[]): Task => {
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
    
    // Always save immediately after creating a task
    saveTasks();
    
    console.log(`Created new task: "${title}" with ID: ${task.id}`);
    return task;
  },
  
  /**
   * Get all tasks
   */
  getAllTasks: (): Task[] => {
    // Ensure tasks are loaded before returning
    if (tasks.length === 0) {
      loadTasks();
    }
    return [...tasks];
  },
  
  /**
   * Get tasks by status
   */
  getTasksByStatus: (status: TaskStatus): Task[] => {
    // Ensure tasks are loaded before filtering
    if (tasks.length === 0) {
      loadTasks();
    }
    return tasks.filter(task => task.status === status);
  },
  
  /**
   * Get tasks by tag
   */
  getTasksByTag: (tag: string): Task[] => {
    return tasks.filter(task => task.tags?.includes(tag));
  },
  
  /**
   * Get tasks by related file
   */
  getTasksByFile: (filePath: string): Task[] => {
    return tasks.filter(task => task.relatedFile === filePath);
  },
  
  /**
   * Update a task's status
   */
  updateTaskStatus: (taskId: string, status: TaskStatus): Task | null => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;
    
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      status,
      updatedAt: new Date().toISOString()
    };
    
    // Make sure to save after updating
    saveTasks();
    return tasks[taskIndex];
  },
  
  /**
   * Update a task's details
   */
  updateTask: (taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | null => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return null;
    
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Make sure to save after updating
    saveTasks();
    return tasks[taskIndex];
  },
  
  /**
   * Delete a task
   */
  deleteTask: (taskId: string): boolean => {
    const initialLength = tasks.length;
    tasks = tasks.filter(task => task.id !== taskId);
    
    if (tasks.length !== initialLength) {
      // Make sure to save after deleting
      saveTasks();
      return true;
    }
    
    return false;
  },
  
  /**
   * Get tasks related to a specific topic or search term
   */
  searchTasks: (searchTerm: string): Task[] => {
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
  reloadTasks: (): Task[] => {
    loadTasks();
    return [...tasks];
  },
  
  /**
   * Clear all tasks (for testing)
   */
  clearTasks: (): void => {
    tasks = [];
    saveTasks();
  }
};
