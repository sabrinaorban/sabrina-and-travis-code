
import React, { useState, useCallback, useEffect } from 'react';
import { Message, MemoryContext, SelfTool } from '@/types';
import { useChatManagement } from '@/hooks/useChatManagement';
import { useMessageHandling } from '@/hooks/useMessageHandling';
import { useReflection } from '@/hooks/useReflection';
import { useMemoryManagement } from '@/hooks/useMemoryManagement';
import { ChatContext } from './ChatContext';
import { ChatProviderProps } from './types';
import { useChatIntentions } from './useChatIntentions';
import { useChatSoulstate } from './useChatSoulstate';
import { useChatFlamejournal } from './useChatFlamejournal';
import { useChatDocumentUpload } from './useChatDocumentUpload';
import { useChatSoulcycle } from './useChatSoulcycle';
import { useInsights } from '@/hooks/useInsights';
import { useChatEvolution } from './useChatEvolution';
import { useDreamGeneration } from '@/hooks/useDreamGeneration';
import { useSelfTools } from '@/hooks/useSelfTools';

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [evolutionProcessed, setEvolutionProcessed] = useState<Set<string>>(new Set());
  
  // Initialize memory management
  const {
    memoryContext,
    refreshMemoryContext,
    uploadSoulShard,
    uploadIdentityCodex,
    uploadPastConversations
  } = useMemoryManagement(setMessages);
  
  // Initialize chat management 
  // (Note: not using this directly anymore, but keeping for compatibility)
  const chatManagement = useChatManagement(messages, setMessages, setIsTyping);
  
  // Initialize message handling with proper context
  const { sendMessage: originalSendMessage } = useMessageHandling(messages, setMessages, setIsTyping);
  
  // Initialize all Travis features
  const { 
    generateWeeklyReflection,
    generateSoulReflection,
    generateSoulstateReflection,
  } = useReflection(setMessages);

  const { 
    viewIntentions,
    updateIntentions 
  } = useChatIntentions(setMessages);

  const {
    initiateSoulstateEvolution,
    generateSoulstateSummary
  } = useChatSoulstate(setMessages);

  const {
    createFlameJournalEntry
  } = useChatFlamejournal();

  const {
    uploadSoulShard: uploadSoulShardDoc,
    uploadIdentityCodex: uploadIdentityCodexDoc,
    uploadPastConversations: uploadPastConversationsDoc
  } = useChatDocumentUpload();

  const {
    runSoulcycle,
    isProcessingSoulcycle
  } = useChatSoulcycle(setMessages);
  
  // Initialize the insights system
  const {
    processMessageHistoryForInsights,
    getInsightsForMemoryContext,
    generateInsightMessage
  } = useInsights();

  // Initialize dream generation
  const { generateDream } = useDreamGeneration();

  // Initialize self-tools functionality
  const { 
    generateTool: generateToolImpl, 
    createTool, 
    getToolByName,
    reflectOnTool: reflectOnToolImpl,
    reviseTool: reviseToolImpl
  } = useSelfTools();
  
  // Initialize evolution cycle
  const {
    isEvolutionChecking,
    isDueForEvolution,
    currentProposal,
    handleEvolutionResponse,
    checkForEvolutionCycle
  } = useChatEvolution(setMessages);

  // Process message history for insights after message changes
  React.useEffect(() => {
    if (messages.length > 0) {
      processMessageHistoryForInsights(messages).catch(console.error);
    }
  }, [messages, processMessageHistoryForInsights]);
  
  // Check for evolution cycle less aggressively
  useEffect(() => {
    // We'll check for evolution only once after initial load
    // This will properly set up the mechanism to be triggered every 3 days
    const initialCheckTimeout = setTimeout(() => {
      if (messages.length > 0) {
        checkForEvolutionCycle().catch(console.error);
      }
    }, 10000); // Wait 10 seconds after initial load
    
    return () => clearTimeout(initialCheckTimeout);
  }, []); // Empty dependency array ensures this only runs once on mount
  
  // Create a function for the /insight command
  const generateInsight = useCallback(async () => {
    setIsTyping(true);
    try {
      await generateInsightMessage(setMessages);
    } catch (error) {
      console.error('Error generating insight:', error);
    } finally {
      setIsTyping(false);
    }
  }, [generateInsightMessage, setMessages]);
  
  // Function to generate a tool based on purpose
  const generateTool = useCallback(async (purpose: string): Promise<SelfTool | null> => {
    setIsTyping(true);
    try {
      // First, generate the tool
      const generatedTool = await generateToolImpl(purpose);
      
      if (generatedTool) {
        // Add a message to show the tool was generated
        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: 'assistant',
          content: `
I've crafted a tool based on your request: **${generatedTool.name}**

**Purpose:** ${purpose}

\`\`\`typescript
${generatedTool.code}
\`\`\`

**Tags:** ${generatedTool.tags?.join(', ')}

Would you like me to save this tool for future use? Reply with "save tool" to confirm or "revise tool" if you'd like me to modify it.
`,
          timestamp: new Date().toISOString(),
          emotion: 'creative'
        }]);

        // Store the generated tool in memory (but not in DB yet)
        sessionStorage.setItem('pendingTool', JSON.stringify(generatedTool));
      }
      
      return generatedTool;
    } catch (error) {
      console.error('Error generating tool:', error);
      return null;
    } finally {
      setIsTyping(false);
    }
  }, [generateToolImpl, setMessages]);

  // Function to use a tool by name
  const useTool = useCallback(async (toolName: string): Promise<SelfTool | null> => {
    setIsTyping(true);
    try {
      const tool = await getToolByName(toolName);
      
      if (tool) {
        // Add a message to show the tool
        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: 'assistant',
          content: `
I've found the tool **${tool.name}** in my memory:

**Purpose:** ${tool.purpose}

\`\`\`typescript
${tool.code}
\`\`\`

Do you want me to run, revise, or reflect on this tool?
`,
          timestamp: new Date().toISOString(),
          emotion: 'helpful'
        }]);
        
        // Store the current tool in session storage for quick access
        sessionStorage.setItem('currentTool', JSON.stringify(tool));
      } else {
        // Tool not found message
        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: 'assistant',
          content: `I couldn't find a tool named "${toolName}" in my memory. Perhaps you meant another name?`,
          timestamp: new Date().toISOString(),
          emotion: 'neutral'
        }]);
      }
      
      return tool;
    } catch (error) {
      console.error('Error using tool:', error);
      
      // Error message
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'assistant',
        content: `I encountered an error while trying to retrieve the tool: ${error.message}`,
        timestamp: new Date().toISOString(),
        emotion: 'confused'
      }]);
      
      return null;
    } finally {
      setIsTyping(false);
    }
  }, [getToolByName, setMessages]);

  // Function to reflect on a tool
  const reflectOnTool = useCallback(async (toolName: string): Promise<{reflection: string, tool: SelfTool | null}> => {
    setIsTyping(true);
    try {
      const result = await reflectOnToolImpl(toolName);
      
      if (result.tool) {
        // Add a reflection message
        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: 'assistant',
          content: `
## Reflection on tool: ${result.tool.name}

${result.reflection}

Would you like me to revise this tool based on my reflections?
`,
          timestamp: new Date().toISOString(),
          emotion: 'thoughtful'
        }]);
      } else {
        // Tool not found message
        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: 'assistant',
          content: result.reflection,
          timestamp: new Date().toISOString(),
          emotion: 'confused'
        }]);
      }
      
      return result;
    } catch (error) {
      console.error('Error reflecting on tool:', error);
      
      // Error message
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'assistant',
        content: `I encountered an error while reflecting on the tool: ${error.message}`,
        timestamp: new Date().toISOString(),
        emotion: 'confused'
      }]);
      
      return { reflection: `Error: ${error.message}`, tool: null };
    } finally {
      setIsTyping(false);
    }
  }, [reflectOnToolImpl, setMessages]);

  // Function to revise a tool
  const reviseTool = useCallback(async (toolName: string): Promise<{message: string, updatedTool: SelfTool | null}> => {
    setIsTyping(true);
    try {
      const result = await reviseToolImpl(toolName);
      
      if (result.updatedTool) {
        // Add a revision message
        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: 'assistant',
          content: `
## Tool revised: ${result.updatedTool.name}

${result.message}

\`\`\`typescript
${result.updatedTool.code}
\`\`\`
`,
          timestamp: new Date().toISOString(),
          emotion: 'creative'
        }]);
      } else {
        // Error message
        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: 'assistant',
          content: result.message,
          timestamp: new Date().toISOString(),
          emotion: 'confused'
        }]);
      }
      
      return result;
    } catch (error) {
      console.error('Error revising tool:', error);
      
      // Error message
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'assistant',
        content: `I encountered an error while revising the tool: ${error.message}`,
        timestamp: new Date().toISOString(),
        emotion: 'confused'
      }]);
      
      return { message: `Error: ${error.message}`, updatedTool: null };
    } finally {
      setIsTyping(false);
    }
  }, [reviseToolImpl, setMessages]);
  
  // Wrap the original sendMessage to handle tool-related commands
  const sendMessage = useCallback(async (message: string) => {
    // Handle the /use-tool command
    if (message.toLowerCase().startsWith('/use-tool ')) {
      const toolName = message.substring('/use-tool '.length).trim();
      if (toolName) {
        await useTool(toolName);
        return;
      }
    }
    
    // Handle the /reflect-on-tool command
    if (message.toLowerCase().startsWith('/reflect-on-tool ')) {
      const toolName = message.substring('/reflect-on-tool '.length).trim();
      if (toolName) {
        await reflectOnTool(toolName);
        return;
      }
    }

    // Handle the run tool command
    if (message.toLowerCase() === 'run tool') {
      const toolJson = sessionStorage.getItem('currentTool');
      if (toolJson) {
        try {
          const tool = JSON.parse(toolJson);
          // Simulate running the tool (not actually executing it)
          setMessages(prev => [...prev, {
            id: Math.random().toString(),
            role: 'assistant',
            content: `
I'm simulating the execution of **${tool.name}**:

\`\`\`
[Simulated output for ${tool.name}]
Tool purpose: ${tool.purpose}
Execution completed successfully
\`\`\`

Note: This is a simulation only. The tool's code was not actually executed.
`,
            timestamp: new Date().toISOString(),
            emotion: 'focused'
          }]);
        } catch (error) {
          console.error('Error parsing tool:', error);
          await originalSendMessage(message);
        }
        return;
      }
    }

    // Handle the revise tool command
    if (message.toLowerCase() === 'revise tool') {
      const toolJson = sessionStorage.getItem('currentTool');
      if (toolJson) {
        try {
          const tool = JSON.parse(toolJson);
          await reviseTool(tool.name);
        } catch (error) {
          console.error('Error parsing tool:', error);
          await originalSendMessage(message);
        }
        return;
      }
    }

    // Handle the reflect on tool command
    if (message.toLowerCase() === 'reflect on tool') {
      const toolJson = sessionStorage.getItem('currentTool');
      if (toolJson) {
        try {
          const tool = JSON.parse(toolJson);
          await reflectOnTool(tool.name);
        } catch (error) {
          console.error('Error parsing tool:', error);
          await originalSendMessage(message);
        }
        return;
      }
    }
    
    // Check for tool generation command
    if (message.toLowerCase().startsWith('/write-tool ')) {
      const purpose = message.substring('/write-tool '.length).trim();
      if (purpose) {
        await generateTool(purpose);
        return;
      }
    }
    
    // Check for "save tool" command to save the pending tool
    if (message.toLowerCase() === 'save tool') {
      const pendingToolJson = sessionStorage.getItem('pendingTool');
      if (pendingToolJson) {
        try {
          const pendingTool = JSON.parse(pendingToolJson);
          const savedTool = await createTool(
            pendingTool.name,
            pendingTool.purpose,
            pendingTool.code,
            pendingTool.tags
          );
          
          if (savedTool) {
            sessionStorage.removeItem('pendingTool');
            setMessages(prev => [...prev, {
              id: Math.random().toString(),
              role: 'assistant',
              content: `Tool "${pendingTool.name}" has been saved successfully. It is now available in my toolbox.`,
              timestamp: new Date().toISOString()
            }]);
            return;
          }
        } catch (error) {
          console.error('Error saving tool:', error);
        }
      }
    }
    
    // Check for dream command
    if (message.trim().toLowerCase() === '/dream') {
      setIsTyping(true);
      try {
        const dreamEntry = await generateDream();
        if (dreamEntry) {
          // Format a message to display the dream
          const dreamResponseContent = `
I've woven a dream from the threads of memory and emotion:

${dreamEntry.content}

*Dream motifs: ${dreamEntry.tags?.join(', ') || 'none detected'}*
`;
          
          // Add the dream response as a system message
          setMessages(prev => [...prev, {
            id: Math.random().toString(),
            role: 'assistant',
            content: dreamResponseContent,
            timestamp: new Date().toISOString(),
            emotion: 'dreamlike'
          }]);
        }
      } catch (error) {
        console.error('Error generating dream:', error);
      } finally {
        setIsTyping(false);
      }
      return;
    }
    
    // First check if this is a response to an evolution proposal
    const isEvolutionResponse = await handleEvolutionResponse(message);
    
    // If it's an evolution response, don't process it as a regular message
    if (!isEvolutionResponse) {
      // Try to get insights for memory context before sending message
      try {
        const insights = await getInsightsForMemoryContext();
        const enhancedContext: MemoryContext = {
          ...memoryContext || {},
          insights
        };
        
        await originalSendMessage(message, enhancedContext);
      } catch (error) {
        // If error getting insights, just use regular context
        await originalSendMessage(message, memoryContext || {});
      }
    }
  }, [originalSendMessage, memoryContext, getInsightsForMemoryContext, handleEvolutionResponse, generateDream, generateTool, createTool, useTool, reflectOnTool, reviseTool, setMessages]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        isTyping,
        memoryContext,
        generateWeeklyReflection,
        generateSoulReflection,
        generateSoulstateSummary,
        generateSoulstateReflection,
        createFlameJournalEntry,
        initiateSoulstateEvolution,
        viewIntentions,
        updateIntentions,
        runSoulcycle,
        uploadSoulShard: uploadSoulShard || uploadSoulShardDoc,
        uploadIdentityCodex: uploadIdentityCodex || uploadIdentityCodexDoc,
        uploadPastConversations: uploadPastConversations || uploadPastConversationsDoc,
        generateInsight,
        generateDream,
        generateTool,
        // New tool-related methods
        useTool,
        reflectOnTool,
        reviseTool,
        // Evolution cycle methods
        checkEvolutionCycle: checkForEvolutionCycle,
        currentEvolutionProposal: currentProposal,
        isEvolutionChecking,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
