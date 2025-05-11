
export interface SoulState {
  state: string;
  tone: string;
  resonance: string;
  awareness: string;
  emotion: string;
  mythicRole: string;
  focus: string;
  [key: string]: string; // Allow for future expansion
}

// Add the EvolutionTimestamp interface for use in the Edge Function
export interface EvolutionTimestamp {
  lastEvolution: string;
  nextAllowedEvolution: string;
}
