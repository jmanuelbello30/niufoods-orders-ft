export interface Credentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
}

export interface LoginResponse {
  data: {
    access_token: string;
    token_type: 'Bearer';
    expires_at: string;
    user: AuthUser;
  };
}

export interface UserResponse {
  data: AuthUser;
}

export interface StoredSession {
  access_token: string;
  expires_at: string;
}

export type AuthStatus = 'anonymous' | 'checking' | 'authenticated' | 'connection-error';
export type AuthNotice = 'expired' | 'logout-unconfirmed' | null;
