export type ExchangeTokenRequest = {
  clientId: string;
  grantType: "authorization_code";
  code: string;
  redirectUri: string;
};

export type ExchangeTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  scope?: string;
};

type OAuthUserInfoBase = {
  openId: string;
  name?: string | null;
  email?: string | null;
  platform?: string | null;
  loginMethod?: string | null;
  platforms?: string[];
};

export type GetUserInfoResponse = OAuthUserInfoBase;

export type GetUserInfoWithJwtRequest = {
  jwtToken: string;
  projectId: string;
};

export type GetUserInfoWithJwtResponse = OAuthUserInfoBase;
