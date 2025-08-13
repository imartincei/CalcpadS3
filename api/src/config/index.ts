import { AuthConfig, JwtConfig, LocalAuthConfig, OIDCConfig, SAMLConfig } from '../models';

export interface AppConfig {
  port: number;
  database: {
    path: string;
  };
  minio: {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucketName: string;
    useSSL: boolean;
  };
  authentication: AuthConfig;
}

export function loadConfig(): AppConfig {
  const jwtConfig: JwtConfig = {
    secret: process.env.JWT_SECRET || 'calcpad-jwt-secret-key-change-in-production-minimum-32-characters',
    expiryInHours: parseInt(process.env.JWT_EXPIRY_HOURS || '24'),
    issuer: process.env.JWT_ISSUER || 'CalcpadS3',
    audience: process.env.JWT_AUDIENCE || 'CalcpadClients'
  };

  const localAuthConfig: LocalAuthConfig = {
    enabled: process.env.LOCAL_AUTH_ENABLED !== 'false',
    requireEmailConfirmation: process.env.REQUIRE_EMAIL_CONFIRMATION === 'true',
    allowUserRegistration: process.env.ALLOW_USER_REGISTRATION !== 'false',
    jwt: jwtConfig
  };

  const oidcConfig: OIDCConfig = {
    enabled: process.env.OIDC_ENABLED === 'true',
    authority: process.env.OIDC_AUTHORITY || '',
    clientId: process.env.OIDC_CLIENT_ID || '',
    clientSecret: process.env.OIDC_CLIENT_SECRET || '',
    scope: process.env.OIDC_SCOPE || 'openid profile email',
    responseType: process.env.OIDC_RESPONSE_TYPE || 'code',
    callbackPath: process.env.OIDC_CALLBACK_PATH || '/signin-oidc'
  };

  const samlConfig: SAMLConfig = {
    enabled: process.env.SAML_ENABLED === 'true',
    entityId: process.env.SAML_ENTITY_ID || '',
    signOnUrl: process.env.SAML_SIGN_ON_URL || '',
    certificate: process.env.SAML_CERTIFICATE || '',
    callbackPath: process.env.SAML_CALLBACK_PATH || '/signin-saml'
  };

  const authConfig: AuthConfig = {
    provider: (process.env.AUTH_PROVIDER as 'Local' | 'OIDC' | 'SAML') || 'Local',
    local: localAuthConfig,
    oidc: oidcConfig,
    saml: samlConfig
  };

  return {
    port: parseInt(process.env.PORT || '5000'),
    database: {
      path: process.env.DATABASE_PATH || '/app/data/calcpad.db'
    },
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost:9000',
      accessKey: process.env.MINIO_ACCESS_KEY || 'calcpad-admin',
      secretKey: process.env.MINIO_SECRET_KEY || 'calcpad-password-123',
      bucketName: process.env.MINIO_BUCKET_NAME || 'calcpad-storage',
      useSSL: process.env.MINIO_USE_SSL === 'true'
    },
    authentication: authConfig
  };
}