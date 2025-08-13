import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { User, UserRole, Tag } from '../models';

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  private async init(): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));
    
    // Create Users table
    await run(`
      CREATE TABLE IF NOT EXISTS Users (
        Id TEXT PRIMARY KEY,
        Username TEXT NOT NULL UNIQUE,
        Email TEXT NOT NULL UNIQUE,
        PasswordHash TEXT NOT NULL,
        Role INTEGER NOT NULL DEFAULT 2,
        CreatedAt TEXT NOT NULL,
        LastLoginAt TEXT,
        IsActive INTEGER NOT NULL DEFAULT 1
      )
    `);

    // Create PreDefinedTags table
    await run(`
      CREATE TABLE IF NOT EXISTS PreDefinedTags (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT NOT NULL UNIQUE
      )
    `);
  }

  // Helper method for SQLite run operations with proper callback handling
  private runQuery<T = unknown>(sql: string, params: unknown[] = []): Promise<{ lastID: number; changes: number; result?: T }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  // User methods
  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const id = crypto.randomUUID();
    
    await this.runQuery(
      `INSERT INTO Users (Id, Username, Email, PasswordHash, Role, CreatedAt, LastLoginAt, IsActive) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user.username, user.email, user.passwordHash, user.role, user.createdAt, user.lastLoginAt, user.isActive ? 1 : 0]
    );

    return { id, ...user };
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params?: unknown[]) => Promise<unknown>;
    
    const row = await get(
      'SELECT * FROM Users WHERE Username = ?',
      [username]
    );

    if (!row) return null;

    const user = row as {
      Id: string;
      Username: string;
      Email: string;
      PasswordHash: string;
      Role: number;
      CreatedAt: string;
      LastLoginAt: string | null;
      IsActive: number;
    };

    return {
      id: user.Id,
      username: user.Username,
      email: user.Email,
      passwordHash: user.PasswordHash,
      role: user.Role as UserRole,
      createdAt: user.CreatedAt,
      lastLoginAt: user.LastLoginAt || undefined,
      isActive: user.IsActive === 1
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params?: unknown[]) => Promise<unknown>;
    
    const row = await get(
      'SELECT * FROM Users WHERE Id = ?',
      [id]
    );

    if (!row) return null;

    const user = row as {
      Id: string;
      Username: string;
      Email: string;
      PasswordHash: string;
      Role: number;
      CreatedAt: string;
      LastLoginAt: string | null;
      IsActive: number;
    };

    return {
      id: user.Id,
      username: user.Username,
      email: user.Email,
      passwordHash: user.PasswordHash,
      role: user.Role as UserRole,
      createdAt: user.CreatedAt,
      lastLoginAt: user.LastLoginAt || undefined,
      isActive: user.IsActive === 1
    };
  }

  async getAllUsers(): Promise<User[]> {
    const all = promisify(this.db.all.bind(this.db)) as (sql: string, params?: unknown[]) => Promise<unknown[]>;
    
    const rows = await all('SELECT * FROM Users');

    return rows.map(row => {
      const user = row as {
        Id: string;
        Username: string;
        Email: string;
        PasswordHash: string;
        Role: number;
        CreatedAt: string;
        LastLoginAt: string | null;
        IsActive: number;
      };

      return {
        id: user.Id,
        username: user.Username,
        email: user.Email,
        passwordHash: user.PasswordHash,
        role: user.Role as UserRole,
        createdAt: user.CreatedAt,
        lastLoginAt: user.LastLoginAt || undefined,
        isActive: user.IsActive === 1
      };
    });
  }

  async updateUser(id: string, updates: Partial<User>): Promise<boolean> {
    const fields = [];
    const values = [];

    if (updates.username) {
      fields.push('Username = ?');
      values.push(updates.username);
    }
    if (updates.email) {
      fields.push('Email = ?');
      values.push(updates.email);
    }
    if (updates.passwordHash) {
      fields.push('PasswordHash = ?');
      values.push(updates.passwordHash);
    }
    if (updates.role !== undefined) {
      fields.push('Role = ?');
      values.push(updates.role);
    }
    if (updates.lastLoginAt !== undefined) {
      fields.push('LastLoginAt = ?');
      values.push(updates.lastLoginAt);
    }
    if (updates.isActive !== undefined) {
      fields.push('IsActive = ?');
      values.push(updates.isActive ? 1 : 0);
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(id);
    
    const result = await this.runQuery(
      `UPDATE Users SET ${fields.join(', ')} WHERE Id = ?`,
      values
    );
    
    return result.changes > 0;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.runQuery('DELETE FROM Users WHERE Id = ?', [id]);
    return result.changes > 0;
  }

  // Tag methods
  async createTag(name: string): Promise<Tag> {
    const result = await this.runQuery(
      'INSERT INTO PreDefinedTags (Name) VALUES (?)',
      [name]
    );

    return {
      id: result.lastID,
      name
    };
  }

  async getAllTags(): Promise<Tag[]> {
    const all = promisify(this.db.all.bind(this.db)) as (sql: string, params?: unknown[]) => Promise<unknown[]>;
    
    const rows = await all('SELECT * FROM PreDefinedTags');

    return rows.map(row => {
      const tag = row as { Id: number; Name: string };
      return {
        id: tag.Id,
        name: tag.Name
      };
    });
  }

  async getTagById(id: number): Promise<Tag | null> {
    const get = promisify(this.db.get.bind(this.db)) as (sql: string, params?: unknown[]) => Promise<unknown>;
    
    const row = await get(
      'SELECT * FROM PreDefinedTags WHERE Id = ?',
      [id]
    );

    if (!row) return null;

    const tag = row as { Id: number; Name: string };
    return {
      id: tag.Id,
      name: tag.Name
    };
  }

  async deleteTag(id: number): Promise<boolean> {
    const result = await this.runQuery('DELETE FROM PreDefinedTags WHERE Id = ?', [id]);
    return result.changes > 0;
  }

  async close(): Promise<void> {
    const close = promisify(this.db.close.bind(this.db));
    await close();
  }
}