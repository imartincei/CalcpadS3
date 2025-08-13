import jwt from 'jsonwebtoken';
import { UserContext } from '../models';

export interface JwtPayload {
  userId: string;
  username: string;
  role: number;
}

export class JwtService {
  private secret: string;
  private expiryInHours: number;
  private issuer: string;
  private audience: string;

  constructor(secret: string, expiryInHours: number, issuer: string, audience: string) {
    this.secret = secret;
    this.expiryInHours = expiryInHours;
    this.issuer = issuer;
    this.audience = audience;
  }

  generateToken(userContext: UserContext): string {
    const payload: JwtPayload = {
      userId: userContext.userId,
      username: userContext.username,
      role: userContext.role
    };

    return jwt.sign(payload, this.secret, {
      expiresIn: `${this.expiryInHours}h`,
      issuer: this.issuer,
      audience: this.audience
    });
  }

  verifyToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      return null;
    }
  }

  getExpirationDate(): Date {
    return new Date(Date.now() + this.expiryInHours * 60 * 60 * 1000);
  }
}