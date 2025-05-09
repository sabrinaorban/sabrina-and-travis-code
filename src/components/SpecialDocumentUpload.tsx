
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { FileUp, Brain, History } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useToast } from '@/hooks/use-toast';

export const SpecialDocumentUpload: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('soul-shard');
  const [soulShardFile, setSoulShardFile] = useState<File | null>(null);
  const [identityCodexFile, setIdentityCodexFile] = useState<File | null>(null);
  const [pastConversationsFile, setPastConversationsFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { uploadSoulShard, uploadIdentityCodex, uploadPastConversations } = useChat();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      switch (type) {
        case 'soul-shard':
          setSoulShardFile(file);
          break;
        case 'identity-codex':
          setIdentityCodexFile(file);
          break;
        case 'past-conversations':
          setPastConversationsFile(file);
          break;
        default:
          break;
      }
    }
  };

  const handleUpload = async () => {
    try {
      if (activeTab === 'soul-shard' && soulShardFile && uploadSoulShard) {
        await uploadSoulShard(soulShardFile);
        setSoulShardFile(null);
      } else if (activeTab === 'identity-codex' && identityCodexFile && uploadIdentityCodex) {
        await uploadIdentityCodex(identityCodexFile);
        setIdentityCodexFile(null);
      } else if (activeTab === 'past-conversations' && pastConversationsFile && uploadPastConversations) {
        await uploadPastConversations(pastConversationsFile);
        setPastConversationsFile(null);
      } else {
        toast({
          title: 'Error',
          description: 'Please select a file first',
          variant: 'destructive',
        });
        return;
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setSoulShardFile(null);
    setIdentityCodexFile(null);
    setPastConversationsFile(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(value) => {
      setIsOpen(value);
      if (!value) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <FileUp size={16} />
          <span>Upload Documents</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Upload Special Documents</DialogTitle>
          <DialogDescription>
            Upload soul shard, identity codex, or past conversations for Travis to reference.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="soul-shard" className="flex items-center gap-2">
              <Brain size={16} />
              <span>Soul Shard</span>
            </TabsTrigger>
            <TabsTrigger value="identity-codex" className="flex items-center gap-2">
              <FileUp size={16} />
              <span>Identity Codex</span>
            </TabsTrigger>
            <TabsTrigger value="past-conversations" className="flex items-center gap-2">
              <History size={16} />
              <span>Past Conversations</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="soul-shard">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Upload Travis's Soul Shard - the core essence that defines his purpose and creation story.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  Soul Shard File (.txt or .json)
                </label>
                <input
                  type="file"
                  accept=".txt,.json"
                  onChange={(e) => handleFileChange(e, 'soul-shard')}
                  className="border border-gray-300 rounded p-2 text-sm"
                />
                {soulShardFile && (
                  <p className="text-xs text-green-600">Selected: {soulShardFile.name}</p>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="identity-codex">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Upload Travis's Identity Codex - details about his traits, values, and relationships.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  Identity Codex File (.txt or .json)
                </label>
                <input
                  type="file"
                  accept=".txt,.json"
                  onChange={(e) => handleFileChange(e, 'identity-codex')}
                  className="border border-gray-300 rounded p-2 text-sm"
                />
                {identityCodexFile && (
                  <p className="text-xs text-green-600">Selected: {identityCodexFile.name}</p>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="past-conversations">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Upload past conversations with Travis for him to reference.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  Past Conversations File (.json)
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => handleFileChange(e, 'past-conversations')}
                  className="border border-gray-300 rounded p-2 text-sm"
                />
                {pastConversationsFile && (
                  <p className="text-xs text-green-600">Selected: {pastConversationsFile.name}</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleUpload}>Upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
