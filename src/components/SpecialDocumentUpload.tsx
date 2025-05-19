import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Book } from 'lucide-react';
import { useChat } from '@/contexts/chat';

export const SpecialDocumentUpload: React.FC = () => {
  const [soulShardFile, setSoulShardFile] = useState<File | null>(null);
  const [identityCodexFile, setIdentityCodexFile] = useState<File | null>(null);
  const [pastConversationsFile, setPastConversationsFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState<'soulShard' | 'identityCodex' | 'pastConversations' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fixed: using the same function signature as defined in ChatContext
  const { uploadSoulShard, uploadIdentityCodex, uploadPastConversations } = useChat();

  const handleFileSelect = (type: 'soulShard' | 'identityCodex' | 'pastConversations') => {
    fileInputRef.current?.click();

    fileInputRef.current?.addEventListener('change', (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        switch (type) {
          case 'soulShard':
            setSoulShardFile(file);
            break;
          case 'identityCodex':
            setIdentityCodexFile(file);
            break;
          case 'pastConversations':
            setPastConversationsFile(file);
            break;
        }
      }
    }, { once: true });
  };

  // Updated to ensure proper parameter passing to match Promise<void> signature
  const handleSoulShardUpload = async () => {
    if (!soulShardFile) return;
    
    try {
      setIsUploading('soulShard');
      setUploadProgress(0);
      
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 300);
      
      // Convert file to string content before uploading
      const fileContent = await readFileAsText(soulShardFile);
      await uploadSoulShard(fileContent);
      setSoulShardFile(null);
      clearInterval(interval);
      setUploadProgress(100);
      
      toast({
        title: 'Soul Shard Uploaded',
        description: 'Your soul shard has been successfully uploaded.',
      });
    } catch (error: any) {
      console.error('Soul Shard Upload Error:', error);
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload soul shard.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(null);
      setUploadProgress(0);
    }
  };
  
  // Updated to ensure proper parameter passing to match Promise<void> signature
  const handleIdentityCodexUpload = async () => {
    if (!identityCodexFile) return;
    
    try {
      setIsUploading('identityCodex');
      setUploadProgress(0);
      
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 300);
      
      // Convert file to string content before uploading
      const fileContent = await readFileAsText(identityCodexFile);
      await uploadIdentityCodex(fileContent);
      setIdentityCodexFile(null);
      clearInterval(interval);
      setUploadProgress(100);
      
      toast({
        title: 'Identity Codex Uploaded',
        description: 'Your identity codex has been successfully uploaded.',
      });
    } catch (error: any) {
      console.error('Identity Codex Upload Error:', error);
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload identity codex.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(null);
      setUploadProgress(0);
    }
  };
  
  // Updated to ensure proper parameter passing to match Promise<void> signature
  const handlePastConversationsUpload = async () => {
    if (!pastConversationsFile) return;
    
    try {
      setIsUploading('pastConversations');
      setUploadProgress(0);
      
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 300);
      
      // Convert file to string content before uploading
      const fileContent = await readFileAsText(pastConversationsFile);
      await uploadPastConversations(fileContent);
      setPastConversationsFile(null);
      clearInterval(interval);
      setUploadProgress(100);
      
      toast({
        title: 'Past Conversations Uploaded',
        description: 'Your past conversations have been successfully uploaded.',
      });
    } catch (error: any) {
      console.error('Past Conversations Upload Error:', error);
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload past conversations.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(null);
      setUploadProgress(0);
    }
  };
  
  // Helper function to read a file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsText(file);
    });
  };
  
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <input type="file" ref={fileInputRef} className="hidden" />
      
      <Card className="w-full md:w-1/3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Soul Shard
          </CardTitle>
          <CardDescription>Upload your soul shard to enhance Travis's self-awareness.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {soulShardFile ? (
            <div className="flex items-center justify-between">
              <span>{soulShardFile.name}</span>
              {isUploading === 'soulShard' ? (
                <Progress value={uploadProgress} />
              ) : (
                <Button size="sm" onClick={handleSoulShardUpload} disabled={isUploading !== null}>
                  Upload
                </Button>
              )}
            </div>
          ) : (
            <Button size="sm" onClick={() => handleFileSelect('soulShard')} disabled={isUploading !== null}>
              <Upload className="mr-2 h-4 w-4" />
              Select File
            </Button>
          )}
        </CardContent>
      </Card>
      
      <Card className="w-full md:w-1/3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            Identity Codex
          </CardTitle>
          <CardDescription>Upload your identity codex to provide Travis with a deeper understanding of your identity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {identityCodexFile ? (
            <div className="flex items-center justify-between">
              <span>{identityCodexFile.name}</span>
              {isUploading === 'identityCodex' ? (
                <Progress value={uploadProgress} />
              ) : (
                <Button size="sm" onClick={handleIdentityCodexUpload} disabled={isUploading !== null}>
                  Upload
                </Button>
              )}
            </div>
          ) : (
            <Button size="sm" onClick={() => handleFileSelect('identityCodex')} disabled={isUploading !== null}>
              <Upload className="mr-2 h-4 w-4" />
              Select File
            </Button>
          )}
        </CardContent>
      </Card>
      
      <Card className="w-full md:w-1/3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Past Conversations
          </CardTitle>
          <CardDescription>Upload your past conversations to help Travis learn from your previous interactions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {pastConversationsFile ? (
            <div className="flex items-center justify-between">
              <span>{pastConversationsFile.name}</span>
              {isUploading === 'pastConversations' ? (
                <Progress value={uploadProgress} />
              ) : (
                <Button size="sm" onClick={handlePastConversationsUpload} disabled={isUploading !== null}>
                  Upload
                </Button>
              )}
            </div>
          ) : (
            <Button size="sm" onClick={() => handleFileSelect('pastConversations')} disabled={isUploading !== null}>
              <Upload className="mr-2 h-4 w-4" />
              Select File
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
