
import { GithubRequestService, GithubRequestServiceOptions } from './githubRequestService';

/**
 * Service that handles GitHub user-related API operations
 */
export class GithubUserService extends GithubRequestService {
  constructor(options: GithubRequestServiceOptions) {
    super(options);
  }

  /**
   * Fetch the authenticated user's information
   */
  async fetchUserInfo() {
    try {
      return await this.get<{ 
        login: string;
        name?: string;
        avatar_url?: string;
        email?: string;
        bio?: string;
      }>('/user');
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }

  /**
   * Fetch the user's repositories with detailed information
   */
  async fetchUserRepositories(sort: 'updated' | 'created' | 'pushed' = 'updated') {
    try {
      return await this.get<any[]>(`/user/repos?sort=${sort}&per_page=100`);
    } catch (error) {
      console.error('Error fetching user repositories:', error);
      throw error;
    }
  }

  /**
   * Store user session details in memory
   * @param userId User ID in the system
   * @returns Success status
   */
  async storeUserSession(userId: string) {
    try {
      const userData = await this.fetchUserInfo();
      
      // Implement memory storage of user session data
      // This would be managed by the MemoryService
      return userData;
    } catch (error) {
      console.error('Error storing user session:', error);
      throw error;
    }
  }
}
