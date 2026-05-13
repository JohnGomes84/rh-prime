export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const LOCAL_LOGIN_PATH = "/login";

export const isOAuthConfigured = () =>
  Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID);

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  if (!isOAuthConfigured() || !oauthPortalUrl || !appId) {
    return LOCAL_LOGIN_PATH;
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  let url: URL;
  try {
    url = new URL("/app-auth", oauthPortalUrl);
  } catch {
    return LOCAL_LOGIN_PATH;
  }

  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
