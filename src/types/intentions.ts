
export interface IntentionMap {
  focus: string[];
  aspirations: string[];
  growthEdges: string[];
  lastUpdated: string;
}

export interface IntentionChange {
  type: 'add' | 'remove' | 'replace';
  category: 'focus' | 'aspirations' | 'growthEdges';
  value: string | string[];
  index?: number; // Optional index for remove operations
}
