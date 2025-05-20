
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
    refreshTasks();
    setIsLoading(false);
  }, []);
  
  // Refresh tasks from the TaskManager
  const refreshTasks = useCallback(() => {
    const allTasks = TaskManager.getAllTasks();
    setTasks(allTasks);
    return allTasks;
  }, []);
  
  // Create a new task
  const createTask = useCallback((title: string, description?: string, relatedFile?: string, tags?: string[]) => {
    try {
      const newTask = TaskManager.createTask(title, description, relatedFile, tags);
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
  const createTaskFromText = useCallback((text: string, description?: string) => {
    try {
      const { title, tags, relatedFile } = TaskManager.parseTask(text);
      if (!title) {
        toast({
          title: "Invalid Task",
          description: "Could not parse task information.",
          variant: "destructive"
        });
        return null;
      }
      
      const newTask = TaskManager.createTask(title, description, relatedFile, tags);
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
  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    try {
      const updatedTask = TaskManager.updateTaskStatus(taskId, status);
      if (!updatedTask) {
        toast({
          title: "Task Not Found",
          description: "Could not find the task to update.",
          variant: "destructive"
        });
        return null;
      }
      
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
