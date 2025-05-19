
import { Message } from '@/types';

export interface CycleResults {
  reflection?: any;
  journalEntry?: any;
  soulstateEvolution?: {
    currentState?: Record<string, any>;
    proposedState?: Record<string, any>;
  };
  appliedEvolution?: any;
  intentionUpdates?: any;
  updatedIntentions?: any;
  summaryEntry?: any;
}

export interface SoulcycleStepProps {
  addSystemMessage: (content: string) => void;
  setCycleResults: React.Dispatch<React.SetStateAction<CycleResults>>;
  user: any;
  cycleResults: CycleResults;
  // Include soulstate as a valid reflection type
  reflectionType?: 'weekly' | 'monthly' | 'quarterly' | 'soulstate';
  includeJournal?: boolean;
  evolutionMode?: 'deep' | 'standard' | 'quick';
}

export type SoulcycleStep = (props: SoulcycleStepProps) => Promise<boolean>;

export interface SoulcycleOptions {
  reflectionType: 'weekly' | 'monthly' | 'quarterly' | 'soulstate';
  includeJournal: boolean;
  evolutionMode: 'deep' | 'standard' | 'quick';
}
