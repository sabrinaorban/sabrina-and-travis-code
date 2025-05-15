
// This file provides the core Toast functionality
import { useState, useEffect } from "react"
import { v4 as uuid } from "uuid"
import { type ToastActionElement } from "./toast"

export type ToastType = {
  id: string
  title?: string
  description?: string
  action?: ToastActionElement
  variant?: "default" | "destructive"
  open: boolean
}

// Set a reasonable toast dismiss delay (in milliseconds)
const TOAST_REMOVE_DELAY = 3000

export type ToastActionType = (props: {
  title?: string
  description?: string
  action?: ToastActionElement
  variant?: "default" | "destructive"
}) => { id: string; dismiss: () => void }

// Create a store for toasts to avoid hook usage outside components
let toastsStore: ToastType[] = [];
let toastListeners: Function[] = [];
// Track toast IDs to prevent duplicates with the same description
const recentToastMessages = new Map<string, number>();
const recentToastIds = new Set<string>();

const notifyListeners = () => {
  toastListeners.forEach(listener => listener(toastsStore));
};

// Helper to prevent duplicate toasts based on their description
const isDuplicateToast = (description?: string): boolean => {
  if (!description) return false;
  
  const currentTime = Date.now();
  if (recentToastMessages.has(description)) {
    const timestamp = recentToastMessages.get(description) || 0;
    // Only consider it a duplicate if it was shown recently (within TOAST_REMOVE_DELAY)
    if (currentTime - timestamp < TOAST_REMOVE_DELAY) {
      console.log('Preventing duplicate toast:', description);
      return true;
    }
  }
  return false;
}

// Function to clean up old toasts
const cleanupToasts = () => {
  const previousCount = toastsStore.length;
  toastsStore = toastsStore.filter(toast => toast.open);
  if (previousCount !== toastsStore.length) {
    notifyListeners();
  }
  
  // Also clean up old entries in recentToastMessages
  const currentTime = Date.now();
  recentToastMessages.forEach((timestamp, message) => {
    if (currentTime - timestamp > TOAST_REMOVE_DELAY * 2) {
      recentToastMessages.delete(message);
    }
  });
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastType[]>(toastsStore);

  // Subscribe to toast changes
  useEffect(() => {
    const listener = (newToasts: ToastType[]) => {
      setToasts([...newToasts]);
    };
    
    toastListeners.push(listener);
    
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const toast: ToastActionType = (props) => {
    // Prevent duplicate toast messages with the same description
    if (isDuplicateToast(props.description)) {
      return {
        id: '',
        dismiss: () => {},
      };
    }

    const id = uuid();
    
    // Skip if we've already shown this exact toast ID recently
    if (recentToastIds.has(id)) {
      return {
        id,
        dismiss: () => {},
      };
    }
    
    const newToast = { id, open: true, ...props };

    // Add to recent messages set to prevent duplicates
    if (props.description) {
      recentToastMessages.set(props.description, Date.now());
      recentToastIds.add(id);
      
      // Remove from tracking after a delay to allow future identical messages
      setTimeout(() => {
        recentToastMessages.delete(props.description as string);
        recentToastIds.delete(id);
      }, TOAST_REMOVE_DELAY * 2);
    }

    toastsStore = [...toastsStore, newToast];
    notifyListeners();

    // Automatically dismiss the toast after the delay
    setTimeout(() => {
      dismiss(id);
    }, TOAST_REMOVE_DELAY);

    return {
      id,
      dismiss: () => {
        dismiss(id);
      },
    };
  };

  const dismiss = (toastId?: string) => {
    toastsStore = toastsStore.map((toast) =>
      toastId === undefined || toast.id === toastId
        ? { ...toast, open: false }
        : toast
    );
    notifyListeners();
    
    // Clean up closed toasts after they're dismissed
    setTimeout(cleanupToasts, 300);
  };

  const remove = (toastId?: string) => {
    toastsStore = toastId
      ? toastsStore.filter((toast) => toast.id !== toastId)
      : [];
    notifyListeners();
  };

  // Clean up closed toasts periodically
  useEffect(() => {
    const interval = setInterval(cleanupToasts, TOAST_REMOVE_DELAY);
    return () => clearInterval(interval);
  }, []);

  return {
    toasts,
    toast,
    dismiss,
    remove,
  };
};

// Export a non-hook version of toast for use outside components
export const toast: ToastActionType = (props) => {
  // Prevent duplicate toast messages with the same description
  if (isDuplicateToast(props.description)) {
    console.log('Preventing duplicate toast:', props.description);
    return {
      id: '',
      dismiss: () => {},
    };
  }

  const id = uuid();
  
  // Skip if we've already shown this exact toast ID recently
  if (recentToastIds.has(id)) {
    return {
      id,
      dismiss: () => {},
    };
  }
  
  const newToast = { id, open: true, ...props };

  // Add to recent messages set to prevent duplicates
  if (props.description) {
    recentToastMessages.set(props.description, Date.now());
    recentToastIds.add(id);
    
    // Remove from tracking after a delay to allow future identical messages
    setTimeout(() => {
      recentToastMessages.delete(props.description as string);
      recentToastIds.delete(id);
    }, TOAST_REMOVE_DELAY * 2);
  }

  toastsStore = [...toastsStore, newToast];
  notifyListeners();
  
  // Automatically dismiss after the delay
  setTimeout(() => {
    toastsStore = toastsStore.map((toast) =>
      toast.id === id ? { ...toast, open: false } : toast
    );
    notifyListeners();
    
    // And remove it after animation
    setTimeout(() => {
      toastsStore = toastsStore.filter((toast) => toast.id !== id);
      notifyListeners();
    }, 300);
  }, TOAST_REMOVE_DELAY);

  return {
    id,
    dismiss: () => {
      toastsStore = toastsStore.map((toast) =>
        toast.id === id ? { ...toast, open: false } : toast
      );
      notifyListeners();
      
      // Remove after animation
      setTimeout(() => {
        toastsStore = toastsStore.filter((toast) => toast.id !== id);
        notifyListeners();
      }, 300);
    },
  };
};
