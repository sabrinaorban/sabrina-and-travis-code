
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
    }
  } catch (error) {
    console.error('Failed to load tasks from storage:', error);
  }
};

// Save tasks to localStorage
const saveTasks = (): void => {
  try {
    localStorage.setItem('travis_tasks', JSON.stringify(tasks));
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
    
    tasks.push(task);
    saveTasks();
    return task;
  },
  
  /**
   * Get all tasks
   */
  getAllTasks: (): Task[] => {
    return [...tasks];
  },
  
  /**
   * Get tasks by status
   */
  getTasksByStatus: (status: TaskStatus): Task[] => {
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
    
    // Clean up the title
    const title = text
      .replace(/#\w+/g, '')  // Remove hashtags
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim();
      
    return { title, tags, relatedFile };
  }
};
