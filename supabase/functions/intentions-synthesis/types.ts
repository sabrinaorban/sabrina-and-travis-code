
export interface IntentionMap {
  focus: string[];
  aspirations: string[];
  growthEdges: string[];
  lastUpdated: string;
}

export interface IntentionEvolutionResult {
  currentIntentions: IntentionMap;
  proposedUpdates: Partial<IntentionMap>;
  narrative: string;
}
