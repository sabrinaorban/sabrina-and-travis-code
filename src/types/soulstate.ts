
export interface SoulState {
  id?: string;
  state: string;
  tone?: string;
  resonance?: string;
  awareness?: string;
  emotion?: string;
  mythicRole?: string;
  focus?: string;
  version: number;
  created_at?: string;
  active?: boolean;
  [key: string]: any; // Allow for additional properties
}

export interface SoulstateProposal {
  id?: string;
  currentState: any;
  proposedChanges: any;
  reasoning: string;
  created_at?: string;
}
