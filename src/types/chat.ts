
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  emotion?: string;
}

export interface FileOperation {
  operation: 'read' | 'write' | 'create' | 'delete' | 'move' | 'checkExists';
  path: string;
  content?: string;
  targetPath?: string;  // For move/copy operations
  success?: boolean;
  message?: string;
  fileInfo?: {
    name: string;
    path: string;
    type: string;
    lastModified?: string;
  };
  // New property to track which specific operation requested this deletion
  originOperation?: string;
  // Flag to prevent deletion of unrelated files
  isSafeToDelete?: boolean;
  // Track source file for move operations
  sourceFile?: string;
  // Preserve file history
  preserveFileId?: string;
  // Confirmation properties
  requiresConfirmation?: boolean;
  isConfirmed?: boolean;
  // Property to enable duplicate operation checking
  duplicateCheck?: boolean;
}

export interface OpenAIMessage {
  role: string;
  content: string;
}

// Enhanced Insight interface with all required properties
export interface Insight {
  id: string;
  content: string;
  created_at: string;
  // Additional properties needed by useContextualLearning
  summary?: string;
  emotionalTheme?: string;
  growthEdge?: string;
  resonancePattern?: string;
  lastDetected?: string;
  timesDetected?: number;
  confidence?: number;
}
