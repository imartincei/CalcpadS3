export interface AuthConfig {
  provider: 'Local' | 'OIDC' | 'SAML';
  local: LocalAuthConfig;
  oidc: OIDCConfig;
  saml: SAMLConfig;
}

export interface LocalAuthConfig {
  enabled: boolean;
  requireEmailConfirmation: boolean;
  allowUserRegistration: boolean;
  jwt: JwtConfig;
}

export interface JwtConfig {
  secret: string;
  expiryInHours: number;
  issuer: string;
  audience: string;
}

export interface OIDCConfig {
  enabled: boolean;
  authority: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  responseType: string;
  callbackPath: string;
}

export interface SAMLConfig {
  enabled: boolean;
  entityId: string;
  signOnUrl: string;
  certificate: string;
  callbackPath: string;
}