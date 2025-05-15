
// This file now provides the core Toast functionality
import { useState } from "react"
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

const TOAST_REMOVE_DELAY = 1000000

export type ToastActionType = (props: {
  title?: string
  description?: string
  action?: ToastActionElement
  variant?: "default" | "destructive"
}) => { id: string; dismiss: () => void }

// Create a store for toasts to avoid hook usage outside components
let toastsStore: ToastType[] = [];
let toastListeners: Function[] = [];

const notifyListeners = () => {
  toastListeners.forEach(listener => listener(toastsStore));
};

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastType[]>(toastsStore);

  // Subscribe to toast changes
  useState(() => {
    const listener = (newToasts: ToastType[]) => {
      setToasts([...newToasts]);
    };
    
    toastListeners.push(listener);
    
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  });

  const toast: ToastActionType = (props) => {
    const id = uuid();
    const newToast = { id, open: true, ...props };

    toastsStore = [...toastsStore, newToast];
    notifyListeners();

    return {
      id,
      dismiss: () => {
        toastsStore = toastsStore.map((toast) =>
          toast.id === id ? { ...toast, open: false } : toast
        );
        notifyListeners();
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
  };

  const remove = (toastId?: string) => {
    toastsStore = toastId
      ? toastsStore.filter((toast) => toast.id !== toastId)
      : [];
    notifyListeners();
  };

  // Clean up closed toasts after delay
  useState(() => {
    const timeout = setTimeout(() => {
      toastsStore = toastsStore.filter(toast => toast.open);
      notifyListeners();
    }, TOAST_REMOVE_DELAY);
    
    return () => clearTimeout(timeout);
  });

  return {
    toasts,
    toast,
    dismiss,
    remove,
  };
};

// Export a non-hook version of toast for use outside components
export const toast: ToastActionType = (props) => {
  const id = uuid();
  const newToast = { id, open: true, ...props };

  toastsStore = [...toastsStore, newToast];
  notifyListeners();
  
  return {
    id,
    dismiss: () => {
      toastsStore = toastsStore.map((toast) =>
        toast.id === id ? { ...toast, open: false } : toast
      );
      notifyListeners();
    },
  };
};
