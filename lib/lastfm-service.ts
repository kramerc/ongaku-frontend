import md5 from 'md5';

export interface LastFmConfig {
  apiKey: string;
  secret: string;
  callbackUrl?: string;
}

export interface LastFmAuthResult {
  sessionKey: string;
  username: string;
}

export interface LastFmScrobbleTrack {
  name: string;
  artist: string;
  album?: string;
  albumArtist?: string;
  duration?: number;
  timestamp?: number;
}

class LastFmService {
  private config: LastFmConfig | null = null;
  private sessionKey: string | null = null;

  /**
   * Initialize the Last.fm service with API credentials
   */
  init(config: LastFmConfig): void {
    this.config = config;
  }

  /**
   * Get the authentication URL for Last.fm authorization
   */
  getAuthUrl(callbackUrl?: string): string {
    if (!this.config) {
      throw new Error('LastFmService not initialized. Call init() first.');
    }

    const baseUrl = 'https://www.last.fm/api/auth/';
    const params = new URLSearchParams({
      api_key: this.config.apiKey,
    });

    if (callbackUrl) {
      params.append('cb', callbackUrl);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate API signature for Last.fm requests
   */
  private generateSignature(params: Record<string, string>): string {
    if (!this.config) {
      throw new Error('LastFmService not initialized');
    }

    // Exclude format and api_sig from signature generation
    const sigParams = { ...params };
    delete sigParams.format;
    delete sigParams.api_sig;

    const sortedKeys = Object.keys(sigParams).sort();
    let string = '';

    for (const key of sortedKeys) {
      string += key + sigParams[key];
    }

    string += this.config.secret;

    console.log('🔐 LastFm Signature: Parameters for signature:', sigParams);
    console.log('🔐 LastFm Signature: Sorted keys:', sortedKeys);
    console.log('🔐 LastFm Signature: String before hash:', string.replace(this.config.secret, '***SECRET***'));

    return md5(string);
  }

  /**
   * Make a request to the Last.fm API
   */
  private async makeApiRequest(params: Record<string, string>): Promise<any> {
    if (!this.config) {
      throw new Error('LastFmService not initialized');
    }

    const apiParams: Record<string, string> = {
      ...params,
      api_key: this.config.apiKey,
      format: 'json',
    };

    console.log('🔧 LastFm API: Parameters before signature:', apiParams);

    const signature = this.generateSignature(apiParams);
    apiParams.api_sig = signature;

    console.log('🔒 LastFm API: Generated signature:', signature);
    console.log('📤 LastFm API: Final parameters:', apiParams);

    const formData = new URLSearchParams(apiParams);

    const response = await fetch('https://ws.audioscrobbler.com/2.0/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    console.log('📡 LastFm API: Response status:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`Last.fm API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📥 LastFm API: Response data:', data);

    if (data.error) {
      throw new Error(`Last.fm API error: ${data.message}`);
    }

    return data;
  }

  /**
   * Authenticate with Last.fm using the token from the callback
   */
  async authenticate(token: string): Promise<LastFmAuthResult> {
    const data = await this.makeApiRequest({
      method: 'auth.getSession',
      token,
    });

    if (!data.session) {
      throw new Error('No session returned from Last.fm');
    }

    this.sessionKey = data.session.key;

    return {
      sessionKey: data.session.key,
      username: data.session.name,
    };
  }

  /**
   * Set the session key for an already authenticated user
   */
  setSessionKey(sessionKey: string): void {
    this.sessionKey = sessionKey;
  }

  /**
   * Get user information
   */
  async getUser(username: string): Promise<any> {
    const data = await this.makeApiRequest({
      method: 'user.getInfo',
      user: username,
    });

    return data.user;
  }

  /**
   * Scrobble a track to Last.fm
   */
  async scrobbleTrack(track: LastFmScrobbleTrack): Promise<void> {
    if (!this.sessionKey) {
      throw new Error('No session key available. Please authenticate first.');
    }

    await this.makeApiRequest({
      method: 'track.scrobble',
      sk: this.sessionKey,
      artist: track.artist,
      track: track.name,
      album: track.album || '',
      albumArtist: track.albumArtist || '',
      duration: track.duration?.toString() || '',
      timestamp: (track.timestamp || Math.floor(Date.now() / 1000)).toString(),
    });
  }

  /**
   * Update the "Now Playing" status on Last.fm
   */
  async updateNowPlaying(track: Omit<LastFmScrobbleTrack, 'timestamp'>): Promise<void> {
    if (!this.sessionKey) {
      throw new Error('No session key available. Please authenticate first.');
    }

    await this.makeApiRequest({
      method: 'track.updateNowPlaying',
      sk: this.sessionKey,
      artist: track.artist,
      track: track.name,
      album: track.album || '',
      albumArtist: track.albumArtist || '',
      duration: track.duration?.toString() || '',
    });
  }

  /**
   * Check if the service is authenticated
   */
  isAuthenticated(): boolean {
    return this.sessionKey !== null;
  }

  /**
   * Clear the session and reset the service
   */
  logout(): void {
    this.sessionKey = null;
  }
}

// Create and export a singleton instance
export const lastFmService = new LastFmService();

// Export the class for testing or multiple instances if needed
export default LastFmService;
