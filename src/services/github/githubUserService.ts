
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
      return await this.get<{ login: string }>('/user');
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }
}
