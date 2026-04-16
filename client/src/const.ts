export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const COMPANY_EMAIL_DOMAINS = ["mlservicoseco.com.br"] as const;
export const COMPANY_EMAIL_DOMAINS_LABEL = COMPANY_EMAIL_DOMAINS.map(
  domain => `@${domain}`
).join(", ");

export const isOAuthConfigured = () =>
  Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID);

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL?.trim();
  const appId = import.meta.env.VITE_APP_ID?.trim();
  if (!oauthPortalUrl || !appId) {
    console.warn(
      "[Auth] OAuth login is not configured. Set VITE_OAUTH_PORTAL_URL and VITE_APP_ID."
    );
    return "#";
  }
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  try {
    const url = new URL("/app-auth", oauthPortalUrl);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch (error) {
    console.warn("[Auth] OAuth login URL is invalid.", error);
    return "#";
  }
};
