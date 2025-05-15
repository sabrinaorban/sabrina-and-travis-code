
import React, { useState, useEffect } from 'react';
import { SelfTool } from '@/types';
import { useSelfTools } from '@/hooks/useSelfTools';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useChat } from '@/contexts/chat';

export const SelfToolsView: React.FC = () => {
  const [tools, setTools] = useState<SelfTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<SelfTool | null>(null);
  const [activeTab, setActiveTab] = useState<string>('code');
  
  const { listTools } = useSelfTools();
  const { reflectOnTool, reviseTool, useTool } = useChat();
  
  useEffect(() => {
    const loadTools = async () => {
      setLoading(true);
      try {
        const toolsList = await listTools();
        setTools(toolsList);
      } catch (error) {
        console.error('Error loading tools:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTools();
  }, [listTools]);
  
  const handleUseClick = () => {
    if (selectedTool) {
      useTool(selectedTool.name);
    }
  };
  
  const handleReflectClick = () => {
    if (selectedTool) {
      reflectOnTool(selectedTool.name);
    }
  };
  
  const handleReviseClick = () => {
    if (selectedTool) {
      reviseTool(selectedTool.name);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-gray-100 dark:bg-gray-800">
        <h2 className="text-2xl font-bold">Travis's Self-Authored Tools</h2>
        <p className="text-muted-foreground">Tools created by Travis to extend his capabilities</p>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <p>Loading tools...</p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 border-r p-4">
            <ScrollArea className="h-[70vh]">
              <div className="space-y-2">
                {tools.length === 0 ? (
                  <p className="text-muted-foreground text-center p-4">No tools have been created yet.</p>
                ) : (
                  tools.map((tool) => (
                    <Card 
                      key={tool.id} 
                      className={`cursor-pointer hover:bg-accent/50 ${selectedTool?.id === tool.id ? 'border-primary' : ''}`}
                      onClick={() => setSelectedTool(tool)}
                    >
                      <CardHeader className="p-4">
                        <CardTitle>{tool.name}</CardTitle>
                        <CardDescription className="line-clamp-2">{tool.purpose}</CardDescription>
                      </CardHeader>
                      <CardFooter className="px-4 py-2">
                        <p className="text-xs text-muted-foreground">Created: {formatDate(tool.created_at)}</p>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          
          <div className="flex-1 p-4">
            {selectedTool ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{selectedTool.name}</h3>
                    <p className="text-muted-foreground">{selectedTool.purpose}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTool.tags?.map((tag) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={handleUseClick}>
                      Use
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleReflectClick}>
                      Reflect
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleReviseClick}>
                      Revise
                    </Button>
                  </div>
                </div>
                
                <Tabs defaultValue="code" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="code">Code</TabsTrigger>
                    <TabsTrigger value="metadata">Metadata</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="code">
                    <ScrollArea className="h-[60vh] border rounded-md bg-muted/50">
                      <div className="p-4">
                        <pre className="whitespace-pre-wrap font-mono text-sm">
                          {selectedTool.code}
                        </pre>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="metadata">
                    <ScrollArea className="h-[60vh] border rounded-md bg-muted/50">
                      <div className="p-4">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium">Created</h4>
                            <p>{formatDate(selectedTool.created_at)}</p>
                          </div>
                          <div>
                            <h4 className="font-medium">Author</h4>
                            <p>{selectedTool.author || 'Travis'}</p>
                          </div>
                          <div>
                            <h4 className="font-medium">Purpose</h4>
                            <p>{selectedTool.purpose}</p>
                          </div>
                          <div>
                            <h4 className="font-medium">Tags</h4>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {selectedTool.tags?.map((tag) => (
                                <Badge key={tag} variant="secondary">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a tool to view its details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
