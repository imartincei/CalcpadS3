import { Database } from '../database';
import { User, UserRole, LoginRequest, RegisterRequest, AuthResponse, UserContext } from '../models';
import { PasswordService, JwtService } from '../utils';

export class UserService {
  private database: Database;
  private passwordService: PasswordService;
  private jwtService: JwtService;

  constructor(database: Database, passwordService: PasswordService, jwtService: JwtService) {
    this.database = database;
    this.passwordService = passwordService;
    this.jwtService = jwtService;
  }

  async loginAsync(request: LoginRequest): Promise<AuthResponse | null> {
    const user = await this.database.getUserByUsername(request.username);
    
    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await this.passwordService.verifyPassword(
      request.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return null;
    }

    // Update last login time
    await this.database.updateUser(user.id, {
      lastLoginAt: new Date().toISOString()
    });

    const userContext: UserContext = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const token = this.jwtService.generateToken(userContext);
    const expiresAt = this.jwtService.getExpirationDate();

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        isActive: user.isActive
      },
      expiresAt: expiresAt.toISOString()
    };
  }

  async registerAsync(request: RegisterRequest): Promise<AuthResponse | null> {
    // Check if username or email already exists
    const existingUser = await this.database.getUserByUsername(request.username);
    if (existingUser) {
      return null;
    }

    const hashedPassword = await this.passwordService.hashPassword(request.password);
    
    const newUser: Omit<User, 'id'> = {
      username: request.username,
      email: request.email,
      passwordHash: hashedPassword,
      role: request.role || UserRole.Contributor,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    const user = await this.database.createUser(newUser);

    const userContext: UserContext = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const token = this.jwtService.generateToken(userContext);
    const expiresAt = this.jwtService.getExpirationDate();

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        isActive: user.isActive
      },
      expiresAt: expiresAt.toISOString()
    };
  }

  async getUserByIdAsync(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.database.getUserById(id);
    
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      isActive: user.isActive
    };
  }

  async getAllUsersAsync(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.database.getAllUsers();
    
    return users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      isActive: user.isActive
    }));
  }

  async updateUserAsync(id: string, updates: Partial<User & { password?: string }>): Promise<boolean> {
    if (updates.password) {
      updates.passwordHash = await this.passwordService.hashPassword(updates.password);
      delete updates.password;
    }

    return this.database.updateUser(id, updates);
  }

  async deleteUserAsync(id: string): Promise<boolean> {
    return this.database.deleteUser(id);
  }

  // Public methods for initialization
  async getUserByUsernameForInit(username: string): Promise<User | null> {
    return this.database.getUserByUsername(username);
  }

  async createUserForInit(user: Omit<User, 'id'>): Promise<User> {
    return this.database.createUser(user);
  }
}