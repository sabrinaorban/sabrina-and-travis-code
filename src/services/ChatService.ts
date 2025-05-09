
// Export API services
export * from './api/MessageApiService';

// Export AI services
export * from './ai/OpenAIService';

// Export utility services
export { 
  ensureFolderExists,
  handleFileOperation 
} from './utils/FileSystemUtils';

export { 
  extractTopicFromMessages,
  simulateAssistantResponse,
  generateConversationSummary,
  isFileOperationRequest
} from './utils/ConversationUtils';

// Export file operation services
export { 
  processFileOperations,
  getProjectStructure
} from './chat/FileOperationService';
