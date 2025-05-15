
import { useState, useCallback } from 'react';
import { Message, SelfTool } from '@/types';
import { useSelfTools } from './useSelfTools';
import { useToast } from './use-toast';

/**
 * Hook for managing self-authored tools within the chat interface
 */
export const useChatTools = (setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  const { 
    generateTool: generateToolImpl, 
    createTool, 
    getToolByName,
    reflectOnTool: reflectOnToolImpl,
    reviseTool: reviseToolImpl
  } = useSelfTools();
  
  // Function to generate a tool based on purpose
  const generateTool = useCallback(async (purpose: string): Promise<SelfTool | null> => {
    setIsProcessing(true);
    try {
      // First, add a message to ask about the tool context
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I'd like to create a tool based on your request. Let me know:
1. Is this tool for me (Travis) or for you?
2. What effect do you want this tool to have?
3. Would you like to link this to any of my intentions?

You can respond with something like "For you, to help with reflection, linked to self-awareness" or simply "For me, to help with UI design".`,
        timestamp: new Date().toISOString(),
        emotion: 'curious'
      }]);
      
      // Store the purpose in session storage for later retrieval
      sessionStorage.setItem('pendingToolPurpose', purpose);
      
      return null;
    } catch (error: any) {
      console.error('Error generating tool:', error);
      toast({
        title: 'Tool Creation Failed',
        description: error.message || 'Failed to initiate tool creation',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [setMessages, toast]);

  // Function to use a tool by name
  const useTool = useCallback(async (toolName: string): Promise<SelfTool | null> => {
    setIsProcessing(true);
    try {
      const tool = await getToolByName(toolName);
      
      if (tool) {
        // Add a message to show the tool
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
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
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I couldn't find a tool named "${toolName}" in my memory. Perhaps you meant another name?`,
          timestamp: new Date().toISOString(),
          emotion: 'neutral'
        }]);
      }
      
      return tool;
    } catch (error: any) {
      console.error('Error using tool:', error);
      
      // Error message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I encountered an error while trying to retrieve the tool: ${error.message}`,
        timestamp: new Date().toISOString(),
        emotion: 'confused'
      }]);
      
      toast({
        title: 'Tool Access Failed',
        description: error.message || 'Failed to access the requested tool',
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [getToolByName, setMessages, toast]);

  // Function to reflect on a tool
  const reflectOnTool = useCallback(async (toolName: string): Promise<{reflection: string, tool: SelfTool | null}> => {
    setIsProcessing(true);
    try {
      const result = await reflectOnToolImpl(toolName);
      
      if (result.tool) {
        // Add a reflection message
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
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
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.reflection,
          timestamp: new Date().toISOString(),
          emotion: 'confused'
        }]);
      }
      
      return result;
    } catch (error: any) {
      console.error('Error reflecting on tool:', error);
      
      // Error message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I encountered an error while reflecting on the tool: ${error.message}`,
        timestamp: new Date().toISOString(),
        emotion: 'confused'
      }]);
      
      toast({
        title: 'Tool Reflection Failed',
        description: error.message || 'Failed to reflect on the tool',
        variant: 'destructive',
      });
      
      return { reflection: `Error: ${error.message}`, tool: null };
    } finally {
      setIsProcessing(false);
    }
  }, [reflectOnToolImpl, setMessages, toast]);

  // Function to revise a tool
  const reviseTool = useCallback(async (toolName: string): Promise<{message: string, updatedTool: SelfTool | null}> => {
    setIsProcessing(true);
    try {
      const result = await reviseToolImpl(toolName);
      
      if (result.updatedTool) {
        // Add a revision message
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
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
          id: crypto.randomUUID(),
          role: 'assistant',
          content: result.message,
          timestamp: new Date().toISOString(),
          emotion: 'confused'
        }]);
      }
      
      return result;
    } catch (error: any) {
      console.error('Error revising tool:', error);
      
      // Error message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I encountered an error while revising the tool: ${error.message}`,
        timestamp: new Date().toISOString(),
        emotion: 'confused'
      }]);
      
      toast({
        title: 'Tool Revision Failed',
        description: error.message || 'Failed to revise the tool',
        variant: 'destructive',
      });
      
      return { message: `Error: ${error.message}`, updatedTool: null };
    } finally {
      setIsProcessing(false);
    }
  }, [reviseToolImpl, setMessages, toast]);
  
  // Handle tool creation from user responses
  const processToolCreation = useCallback(async (userMessage: string): Promise<boolean> => {
    // Check for pending tool purpose and tool context
    const pendingToolPurpose = sessionStorage.getItem('pendingToolPurpose');
    if (!pendingToolPurpose || userMessage.toLowerCase().startsWith('/')) {
      return false;
    }
    
    setIsProcessing(true);
    try {
      // Parse the user's response for tool context
      const responseParts = userMessage.split(',').map(part => part.trim());
      
      let owner = 'travis';
      let intendedEffect = '';
      let linkedIntention = '';
      
      // Determine owner from response
      if (responseParts[0].toLowerCase().includes('you') || 
          responseParts[0].toLowerCase().includes('travis')) {
        owner = 'travis';
      } else if (responseParts[0].toLowerCase().includes('me') || 
                responseParts[0].toLowerCase().includes('user')) {
        owner = 'user';
      }
      
      // Get intended effect if provided
      if (responseParts.length > 1) {
        intendedEffect = responseParts[1];
      }
      
      // Get linked intention if provided
      if (responseParts.length > 2 && responseParts[2].toLowerCase().includes('link')) {
        linkedIntention = responseParts[2].replace(/link(ed)?\s*(to)?/i, '').trim();
      }
      
      // Generate the tool with the parsed context
      const generatedTool = await generateToolImpl(
        pendingToolPurpose,
        owner,
        intendedEffect,
        linkedIntention
      );
      
      if (generatedTool) {
        // Add a message to show the tool was generated
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `
I've crafted a tool based on your request: **${generatedTool.name}**

**Purpose:** ${generatedTool.purpose}
**For:** ${generatedTool.owner === 'travis' ? 'Myself (Travis)' : 'You'}
**Intended Effect:** ${generatedTool.intended_effect || 'Not specified'}
${generatedTool.linked_intention ? `**Linked to Intention:** ${generatedTool.linked_intention}` : ''}

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
        // Clear the pending tool purpose
        sessionStorage.removeItem('pendingToolPurpose');
      }
      
      return true;
    } catch (error: any) {
      console.error('Error processing tool context:', error);
      toast({
        title: 'Tool Creation Failed',
        description: error.message || 'Failed to generate the tool',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [generateToolImpl, setMessages, toast]);
  
  // Handle saving a pending tool
  const handleSaveTool = useCallback(async (): Promise<boolean> => {
    const pendingToolJson = sessionStorage.getItem('pendingTool');
    if (!pendingToolJson) {
      return false;
    }
    
    setIsProcessing(true);
    try {
      const pendingTool = JSON.parse(pendingToolJson);
      const savedTool = await createTool(
        pendingTool.name,
        pendingTool.purpose,
        pendingTool.code,
        pendingTool.tags,
        pendingTool.owner,
        pendingTool.intended_effect,
        pendingTool.linked_intention
      );
      
      if (savedTool) {
        sessionStorage.removeItem('pendingTool');
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Tool "${pendingTool.name}" has been saved successfully. It is now available in my toolbox.`,
          timestamp: new Date().toISOString(),
          emotion: 'happy'
        }]);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Error saving tool:', error);
      toast({
        title: 'Tool Saving Failed',
        description: error.message || 'Failed to save the tool',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [createTool, setMessages, toast]);
  
  // Handle tool actions based on user command
  const handleToolCommand = useCallback(async (message: string): Promise<boolean> => {
    // Check for "save tool" command to save the pending tool
    if (message.toLowerCase() === 'save tool') {
      return await handleSaveTool();
    }
    
    // Handle the run tool command
    if (message.toLowerCase() === 'run tool') {
      const toolJson = sessionStorage.getItem('currentTool');
      if (toolJson) {
        try {
          const tool = JSON.parse(toolJson);
          // Simulate running the tool (not actually executing it)
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
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
          
          return true;
        } catch (error) {
          console.error('Error parsing tool:', error);
        }
      }
    }

    // Handle the revise tool command
    if (message.toLowerCase() === 'revise tool') {
      const toolJson = sessionStorage.getItem('currentTool');
      if (toolJson) {
        try {
          const tool = JSON.parse(toolJson);
          await reviseTool(tool.name);
          return true;
        } catch (error) {
          console.error('Error parsing tool:', error);
        }
      }
    }

    // Handle the reflect on tool command
    if (message.toLowerCase() === 'reflect on tool') {
      const toolJson = sessionStorage.getItem('currentTool');
      if (toolJson) {
        try {
          const tool = JSON.parse(toolJson);
          await reflectOnTool(tool.name);
          return true;
        } catch (error) {
          console.error('Error parsing tool:', error);
        }
      }
    }
    
    return false;
  }, [handleSaveTool, reviseTool, reflectOnTool, setMessages]);

  return {
    generateTool,
    useTool,
    reflectOnTool,
    reviseTool,
    processToolCreation,
    handleToolCommand,
    isProcessing
  };
};
