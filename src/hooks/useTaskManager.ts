
import { useState, useCallback, useEffect } from 'react';
import { TaskManager } from '@/services/TaskManager';
import { Task, TaskStatus } from '@/types/task';
import { useToast } from './use-toast';

export const useTaskManager = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  // Load tasks on initialization
  useEffect(() => {
    console.log("useTaskManager: Initializing and loading tasks");
    refreshTasks();
  }, []);
  
  // Refresh tasks from the TaskManager
  const refreshTasks = useCallback(async () => {
    console.log("useTaskManager: Refreshing tasks");
    setIsLoading(true);
    try {
      const allTasks = await TaskManager.reloadTasks(); // Force reload from storage
      console.log(`useTaskManager: Retrieved ${allTasks.length} tasks`);
      setTasks(allTasks);
      setIsLoading(false);
      return allTasks;
    } catch (error) {
      console.error("useTaskManager: Error refreshing tasks", error);
      setIsLoading(false);
      return [];
    }
  }, []);
  
  // Create a new task
  const createTask = useCallback(async (title: string, description?: string, relatedFile?: string, tags?: string[]) => {
    try {
      console.log(`useTaskManager: Creating task "${title}"`);
      const newTask = await TaskManager.createTask(title, description, relatedFile, tags);
      console.log(`useTaskManager: Task created with ID ${newTask.id}`);
      
      // Update local state
      refreshTasks();
      
      toast({
        title: "Task Created",
        description: `New task "${title}" has been created.`
      });
      return newTask;
    } catch (error) {
      console.error('Failed to create task:', error);
      toast({
        title: "Task Creation Failed",
        description: "Could not create the task.",
        variant: "destructive"
      });
      return null;
    }
  }, [refreshTasks, toast]);
  
  // Create a task from natural language
  const createTaskFromText = useCallback(async (text: string, description?: string) => {
    try {
      console.log(`useTaskManager: Creating task from text "${text}"`);
      const { title, tags, relatedFile } = TaskManager.parseTask(text);
      if (!title) {
        console.error("useTaskManager: Could not parse task title");
        toast({
          title: "Invalid Task",
          description: "Could not parse task information.",
          variant: "destructive"
        });
        return null;
      }
      
      console.log(`useTaskManager: Parsed task - title: "${title}", tags: ${JSON.stringify(tags)}`);
      const newTask = await TaskManager.createTask(title, description, relatedFile, tags);
      console.log(`useTaskManager: Task created with ID ${newTask.id}`);
      
      // Update local state
      refreshTasks();
      
      toast({
        title: "Task Created",
        description: `New task "${title}" has been created.`
      });
      return newTask;
    } catch (error) {
      console.error('Failed to create task from text:', error);
      toast({
        title: "Task Creation Failed", 
        description: "Could not create the task.",
        variant: "destructive"
      });
      return null;
    }
  }, [refreshTasks, toast]);
  
  // Update a task's status
  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    try {
      console.log(`useTaskManager: Updating task ${taskId} to status ${status}`);
      const updatedTask = await TaskManager.updateTaskStatus(taskId, status);
      if (!updatedTask) {
        console.error(`useTaskManager: Task ${taskId} not found`);
        toast({
          title: "Task Not Found",
          description: "Could not find the task to update.",
          variant: "destructive"
        });
        return null;
      }
      
      // Update local state
      refreshTasks();
      
      toast({
        title: "Task Updated",
        description: `Task "${updatedTask.title}" is now ${status}.`
      });
      return updatedTask;
    } catch (error) {
      console.error('Failed to update task status:', error);
      toast({
        title: "Task Update Failed",
        description: "Could not update the task status.",
        variant: "destructive"
      });
      return null;
    }
  }, [refreshTasks, toast]);
  
  // Get relevant tasks for a file
  const getRelevantTasks = useCallback((filePath?: string, topic?: string) => {
    if (filePath) {
      return TaskManager.getTasksByFile(filePath);
    }
    if (topic) {
      return TaskManager.searchTasks(topic);
    }
    return [];
  }, []);
  
  return {
    tasks,
    isLoading,
    refreshTasks,
    createTask,
    createTaskFromText,
    updateTaskStatus,
    getRelevantTasks,
    // Expose more TaskManager methods as needed
    getTasksByStatus: TaskManager.getTasksByStatus,
    getTasksByTag: TaskManager.getTasksByTag,
    getTasksByFile: TaskManager.getTasksByFile,
    updateTask: TaskManager.updateTask,
    deleteTask: TaskManager.deleteTask,
    searchTasks: TaskManager.searchTasks
  };
};
