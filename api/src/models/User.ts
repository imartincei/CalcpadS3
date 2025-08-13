export enum UserRole {
  Viewer = 1,      // Read-only access to all files and metadata
  Contributor = 2, // Can read files, update metadata  
  Admin = 3        // Full control: delete files, manage users, update roles
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserRequest {
  role: UserRole;
  isActive: boolean;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'passwordHash'>;
  expiresAt: string;
}

export interface UserContext {
  userId: string;
  username: string;
  role: UserRole;
}