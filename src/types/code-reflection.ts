
/**
 * Types for code self-reflection and evolution functionality
 */

export interface CodeReflectionDraft {
  id: string;
  file_path: string;
  original_code: string;
  proposed_code: string;
  reason: string;
  created_at: string;
  reflection_type?: 'file' | 'folder';
  full_reflection?: string;
  tags?: string[];
}

export type CodeReflectionStatus = 'pending' | 'approved' | 'discarded';

export interface CodeReflectionResult {
  success: boolean;
  draft?: CodeReflectionDraft;
  error?: string;
  insight?: string;
}
