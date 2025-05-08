
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          timestamp: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'user' | 'assistant'
          content?: string
          timestamp?: string
        }
      }
      files: {
        Row: {
          id: string
          user_id: string
          name: string
          path: string
          type: 'file' | 'folder'
          content: string | null
          last_modified: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          path: string
          type: 'file' | 'folder'
          content?: string | null
          last_modified?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          path?: string
          type?: 'file' | 'folder'
          content?: string | null
          last_modified?: string
          created_at?: string
        }
      }
      memory: {
        Row: {
          id: string
          user_id: string
          key: string
          value: Json
          last_accessed: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          key: string
          value: Json
          last_accessed?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          key?: string
          value?: Json
          last_accessed?: string
          created_at?: string
        }
      }
      github_tokens: {
        Row: {
          id: string
          user_id: string
          access_token: string
          refresh_token: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          refresh_token?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token?: string
          refresh_token?: string | null
          expires_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
