// Clerk OAuth 2.0 IdP configuration (shared across auth modules)
const CLERK_DOMAIN = "https://clerk.curate.is";

export const CLERK_AUTHORIZE_URL = `${CLERK_DOMAIN}/oauth/authorize`;
export const CLERK_TOKEN_URL = `${CLERK_DOMAIN}/oauth/token`;
export const CLERK_REVOKE_URL = `${CLERK_DOMAIN}/oauth/token/revoke`;
export const CLERK_OAUTH_CLIENT_ID = process.env.CLERK_OAUTH_CLIENT_ID ?? "";
