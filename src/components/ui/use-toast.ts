
import { useToast as useToastHook } from "@/hooks/use-toast";

export const useToast = useToastHook;

// Re-export the individual toast function for direct use
import { toast } from "@/hooks/use-toast";
export { toast };
