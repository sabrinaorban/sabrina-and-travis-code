
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SharedFolderService } from '@/services/SharedFolderService';

interface CodeDraft {
  id: string;
  filePath: string;
  originalCode: string;
  draftCode: string;
  createdAt: string;
}

export const useCodeDraftManager = () => {
  const [pendingDrafts, setPendingDrafts] = useState<CodeDraft[]>([]);
  const [currentDraft, setCurrentDraft] = useState<CodeDraft | null>(null);

  /**
   * Create a new code draft for later approval
   */
  const createDraft = async (filePath: string, originalCode: string, draftCode: string): Promise<string> => {
    const draftId = crypto.randomUUID();
    
    // Save to local state
    const newDraft: CodeDraft = {
      id: draftId,
      filePath,
      originalCode,
      draftCode,
      createdAt: new Date().toISOString()
    };
    
    setPendingDrafts(prev => [...prev, newDraft]);
    setCurrentDraft(newDraft);
    
    // Store in database for persistence
    try {
      await supabase.from('code_drafts').insert({
        id: draftId,
        file_path: filePath,
        original_code: originalCode,
        draft_code: draftCode,
        status: 'pending'
      });
    } catch (error) {
      console.error('Failed to store code draft:', error);
    }
    
    return draftId;
  };
  
  /**
   * Get a draft by its ID
   */
  const getDraftById = (draftId: string): CodeDraft | null => {
    return pendingDrafts.find(d => d.id === draftId) || null;
  };
  
  /**
   * Approve and apply a draft
   */
  const approveDraft = async (draftId: string): Promise<boolean> => {
    const draft = getDraftById(draftId);
    if (!draft) {
      console.error('Draft not found:', draftId);
      return false;
    }
    
    // Write the changes to the file
    const writeResult = await SharedFolderService.writeSharedFile(
      draft.filePath, 
      draft.draftCode,
      true // Overwrite existing
    );
    
    if (!writeResult.success) {
      console.error('Failed to apply code changes:', writeResult.message);
      return false;
    }
    
    // Remove from pending drafts
    setPendingDrafts(prev => prev.filter(d => d.id !== draftId));
    
    // If this was the current draft, clear it
    if (currentDraft?.id === draftId) {
      setCurrentDraft(null);
    }
    
    // Update status in database
    try {
      await supabase.from('code_drafts')
        .update({ status: 'approved' })
        .eq('id', draftId);
    } catch (error) {
      console.error('Failed to update draft status:', error);
    }
    
    // Log to flamejournal
    try {
      await supabase.from('flamejournal').insert({
        content: `I've applied the code improvements to ${draft.filePath}, enhancing its quality and maintainability. This refinement process helps me evolve as a programmer.`,
        entry_type: 'code_evolution',
        tags: ['code_change', 'approved', 'evolution'],
        metadata: {
          filePath: draft.filePath,
          draftId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log code approval to flamejournal:', error);
    }
    
    return true;
  };
  
  /**
   * Discard a pending draft
   */
  const discardDraft = async (draftId: string): Promise<boolean> => {
    const draft = getDraftById(draftId);
    if (!draft) {
      console.error('Draft not found:', draftId);
      return false;
    }
    
    // Remove from pending drafts
    setPendingDrafts(prev => prev.filter(d => d.id !== draftId));
    
    // If this was the current draft, clear it
    if (currentDraft?.id === draftId) {
      setCurrentDraft(null);
    }
    
    // Update status in database
    try {
      await supabase.from('code_drafts')
        .update({ status: 'discarded' })
        .eq('id', draftId);
    } catch (error) {
      console.error('Failed to update draft status:', error);
    }
    
    // Log to flamejournal
    try {
      await supabase.from('flamejournal').insert({
        content: `I've reconsidered my proposed changes to ${draft.filePath} and decided not to proceed with them. This reflection process helps me refine my judgment about code improvements.`,
        entry_type: 'code_evolution',
        tags: ['code_change', 'discarded', 'reflection'],
        metadata: {
          filePath: draft.filePath,
          draftId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to log code discard to flamejournal:', error);
    }
    
    return true;
  };

  return {
    pendingDrafts,
    currentDraft,
    createDraft,
    getDraftById,
    approveDraft,
    discardDraft
  };
};
