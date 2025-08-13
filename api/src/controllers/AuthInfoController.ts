import { Request, Response } from 'express';
import { AuthConfig } from '../models';

export class AuthInfoController {
  private authConfig: AuthConfig;

  constructor(authConfig: AuthConfig) {
    this.authConfig = authConfig;
  }

  getAuthInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      // Return public authentication configuration
      const publicConfig = {
        provider: this.authConfig.provider,
        local: {
          enabled: this.authConfig.local.enabled,
          allowUserRegistration: this.authConfig.local.allowUserRegistration,
          requireEmailConfirmation: this.authConfig.local.requireEmailConfirmation
        },
        oidc: {
          enabled: this.authConfig.oidc.enabled,
          authority: this.authConfig.oidc.authority,
          clientId: this.authConfig.oidc.clientId,
          scope: this.authConfig.oidc.scope,
          responseType: this.authConfig.oidc.responseType,
          callbackPath: this.authConfig.oidc.callbackPath
        },
        saml: {
          enabled: this.authConfig.saml.enabled,
          entityId: this.authConfig.saml.entityId,
          signOnUrl: this.authConfig.saml.signOnUrl,
          callbackPath: this.authConfig.saml.callbackPath
        }
      };

      res.json(publicConfig);
    } catch (error) {
      console.error('Error getting auth info:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}