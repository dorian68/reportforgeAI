interface GoogleTokenClientResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClientError {
  type: string;
  message?: string;
}

interface GoogleTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenClientResponse) => void;
  error_callback?: (error: GoogleTokenClientError) => void;
  include_granted_scopes?: boolean;
}

interface GoogleTokenClientRequestOptions {
  prompt?: string;
  hint?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (options?: GoogleTokenClientRequestOptions) => void;
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: (config: GoogleTokenClientConfig) => GoogleTokenClient;
        revoke: (token: string, callback: () => void) => void;
      };
    };
  };
}
