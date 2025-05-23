
export interface SelfTool {
  id?: string;
  name: string;
  purpose: string;
  code: string;
  created_at?: string;
  tags?: string[];
  author?: string;
  version?: number;
  iterations?: SelfToolIteration[];
  owner: string;
  intended_effect?: string;
  linked_intention?: string;
}

export interface SelfToolIteration {
  id?: string;
  tool_id: string;
  version: number;
  code: string;
  reflection: string;
  created_at?: string;
}
