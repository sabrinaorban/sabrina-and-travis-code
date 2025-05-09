
/**
 * Service that handles base GitHub API requests with authentication
 */
export interface GithubRequestServiceOptions {
  token: string | null;
}

export class GithubRequestService {
  private token: string | null;

  constructor({ token }: GithubRequestServiceOptions) {
    this.token = token;
  }

  protected getHeaders() {
    return {
      Authorization: this.token ? `token ${this.token}` : '',
      Accept: 'application/vnd.github.v3+json'
    };
  }

  /**
   * Make an authenticated request to the GitHub API
   */
  protected async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...(options.headers || {})
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error(`Error making GitHub API request to ${url}:`, error);
      throw error;
    }
  }

  /**
   * Make a GET request to the GitHub API
   */
  protected async get<T>(endpoint: string): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
    return this.makeRequest<T>(url);
  }

  /**
   * Make a POST request to the GitHub API
   */
  protected async post<T>(endpoint: string, data: any): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
    return this.makeRequest<T>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }

  /**
   * Make a PUT request to the GitHub API
   */
  protected async put<T>(endpoint: string, data: any): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
    return this.makeRequest<T>(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }

  /**
   * Make a DELETE request to the GitHub API
   */
  protected async delete<T>(endpoint: string): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
    return this.makeRequest<T>(url, {
      method: 'DELETE'
    });
  }
}
