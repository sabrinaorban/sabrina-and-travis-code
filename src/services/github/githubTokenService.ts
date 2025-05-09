
import { supabase } from '@/lib/supabase';

export class GithubTokenService {
  /**
   * Save GitHub token to Supabase
   */
  static async saveToken(userId: string, token: string, username: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('github_tokens')
        .upsert({ 
          user_id: userId,
          token,
          username,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      return true;
    } catch (err) {
      console.error('Error saving GitHub token:', err);
      return false;
    }
  }

  /**
   * Load GitHub token from Supabase
   */
  static async loadToken(userId: string): Promise<{ token: string | null; username: string | null }> {
    try {
      const { data, error } = await supabase
        .from('github_tokens')
        .select('token, username')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        throw error;
      }
      
      return {
        token: data?.token || null,
        username: data?.username || null
      };
    } catch (err) {
      console.error('Error loading GitHub token:', err);
      return { token: null, username: null };
    }
  }

  /**
   * Delete GitHub token from Supabase
   */
  static async deleteToken(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('github_tokens')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return true;
    } catch (err) {
      console.error('Error deleting GitHub token:', err);
      return false;
    }
  }
}
