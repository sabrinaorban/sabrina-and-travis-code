
import { useToast as useToastOriginal, toast as toastOriginal } from "@/components/ui/use-toast";

// Re-export the toast functionality
export const useToast = useToastOriginal;
export const toast = toastOriginal;
