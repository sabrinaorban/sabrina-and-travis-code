
// This file now provides the core Toast functionality
import { useCallback, useEffect, useState } from "react"
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
}) => void

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastType[]>([])

  const toast: ToastActionType = useCallback((props) => {
    const id = uuid()
    const newToast = { id, open: true, ...props }

    setToasts((currentToasts) => [...currentToasts, newToast])

    return {
      id,
      dismiss: () => setToasts((currentToasts) =>
        currentToasts.map((toast) =>
          toast.id === id ? { ...toast, open: false } : toast
        )
      ),
    }
  }, [])

  const dismiss = useCallback((toastId?: string) => {
    setToasts((currentToasts) =>
      currentToasts.map((toast) =>
        toastId === undefined || toast.id === toastId
          ? { ...toast, open: false }
          : toast
      )
    )
  }, [])

  const remove = useCallback((toastId?: string) => {
    setToasts((currentToasts) =>
      toastId
        ? currentToasts.filter((toast) => toast.id !== toastId)
        : []
    )
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      toasts
        .filter((toast) => !toast.open)
        .forEach((toast) => remove(toast.id))
    }, TOAST_REMOVE_DELAY)

    return () => clearTimeout(timeoutId)
  }, [toasts, remove])

  return {
    toasts,
    toast,
    dismiss,
    remove,
  }
}

// Export the toast function for direct use
export const toast: ToastActionType = (props) => {
  const { toast: toastAction } = useToast()
  return toastAction(props)
}
