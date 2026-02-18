import crypto from "node:crypto";

/**
 * User scopes required for Slack's MCP server.
 * @see https://docs.slack.dev/ai/slack-mcp-server/
 */
const MCP_USER_SCOPES = [
  "search:read",
  "channels:history",
  "channels:read",
  "groups:history",
  "groups:read",
  "mpim:history",
  "mpim:read",
  "im:history",
  "im:read",
  "users:read",
  "users:read.email",
  "chat:write",
  "canvases:read",
  "canvases:write",
  "files:read",
  "reactions:read",
  "team:read",
  "usergroups:read",
];

function getConfig() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const stateSecret = process.env.SLACK_STATE_SECRET;

  if (!clientId || !clientSecret || !stateSecret) {
    throw new Error(
      "Missing SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, or SLACK_STATE_SECRET environment variables."
    );
  }

  return { clientId, clientSecret, stateSecret };
}

/**
 * Generates a signed state parameter for OAuth CSRF protection.
 * Format: `<random>.<timestamp>.<signature>`
 */
export function generateOAuthState(): { state: string } {
  const { stateSecret } = getConfig();
  const random = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now().toString();
  const payload = `${random}.${timestamp}`;
  const signature = crypto
    .createHmac("sha256", stateSecret)
    .update(payload)
    .digest("hex");

  return { state: `${payload}.${signature}` };
}

/**
 * Verifies an OAuth state parameter. Returns true if valid and not expired (10 min window).
 */
export function verifyOAuthState(state: string): boolean {
  const { stateSecret } = getConfig();
  const parts = state.split(".");
  if (parts.length !== 3) return false;

  const [random, timestamp, signature] = parts;
  const payload = `${random}.${timestamp}`;
  const expected = crypto
    .createHmac("sha256", stateSecret)
    .update(payload)
    .digest("hex");

  // Constant-time comparison
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return false;
  }

  // Check expiration (10 minutes)
  const elapsed = Date.now() - Number.parseInt(timestamp, 10);
  if (elapsed > 10 * 60 * 1000) return false;

  return true;
}

/**
 * Builds the Slack OAuth authorization URL for user token grants.
 */
export function getInstallUrl(state: string): string {
  const { clientId } = getConfig();
  const redirectUri = `${getBaseUrl()}/slack/oauth_redirect`;

  const params = new URLSearchParams({
    client_id: clientId,
    user_scope: MCP_USER_SCOPES.join(","),
    state,
    redirect_uri: redirectUri,
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

/**
 * Exchanges an OAuth authorization code for tokens using Slack's oauth.v2.access endpoint.
 */
export async function exchangeCodeForToken(code: string): Promise<{
  ok: boolean;
  authed_user?: {
    id: string;
    scope: string;
    access_token: string;
    token_type: string;
  };
  team?: { id: string; name: string };
  enterprise?: { id: string; name: string } | null;
  app_id?: string;
  error?: string;
}> {
  const { clientId, clientSecret } = getConfig();
  const redirectUri = `${getBaseUrl()}/slack/oauth_redirect`;

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  return response.json();
}

/**
 * Returns the base URL for OAuth redirects.
 * Uses VERCEL_PROJECT_PRODUCTION_URL, VERCEL_URL, or falls back to localhost.
 */
function getBaseUrl(): string {
  if (process.env.SLACK_OAUTH_REDIRECT_URL) {
    return process.env.SLACK_OAUTH_REDIRECT_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
