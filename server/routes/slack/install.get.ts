import { generateOAuthState, getInstallUrl } from "~/lib/slack/oauth";

/**
 * GET /slack/install
 *
 * Initiates the Slack OAuth flow by redirecting to Slack's authorization page.
 * This grants the app user-level scopes needed for MCP tools.
 */
export default defineEventHandler((event) => {
  const { state } = generateOAuthState();

  // Store state in a short-lived cookie for CSRF verification on callback
  setCookie(event, "slack_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return sendRedirect(event, getInstallUrl(state));
});
