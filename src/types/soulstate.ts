
export interface SoulState {
  id?: string;
  state: any;
  version: number;
  created_at?: string;
  active?: boolean;
}

export interface SoulstateProposal {
  id?: string;
  currentState: any;
  proposedChanges: any;
  reasoning: string;
  created_at?: string;
}
