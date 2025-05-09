
import { supabase } from '@/lib/supabase';

export class GithubTokenService {
  /**
   * Save GitHub token to Supabase
   */
  static async saveToken(userId: string, token: string, username: string | null): Promise<void> {
    try {
      const { error } = await supabase
        .from('github_tokens')
        .upsert({
          user_id: userId,
          token,
          username,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
        
      if (error) throw error;
      console.log('GitHub token saved successfully');
    } catch (error) {
      console.error('Error saving GitHub token:', error);
      throw error;
    }
  }

  /**
   * Load GitHub token from Supabase
   */
  static async loadToken(userId: string): Promise<{ token: string; username: string | null }> {
    try {
      const { data, error } = await supabase
        .from('github_tokens')
        .select('token, username')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (error) throw error;
      
      return {
        token: data?.token || '',
        username: data?.username || null
      };
    } catch (error) {
      console.error('Error loading GitHub token:', error);
      return { token: '', username: null };
    }
  }

  /**
   * Delete GitHub token from Supabase
   */
  static async deleteToken(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('github_tokens')
        .delete()
        .eq('user_id', userId);
        
      if (error) throw error;
      console.log('GitHub token deleted successfully');
    } catch (error) {
      console.error('Error deleting GitHub token:', error);
      throw error;
    }
  }
}
