import { verifyOAuthState, exchangeCodeForToken } from "~/lib/slack/oauth";
import { storeInstallation } from "~/lib/slack/installation-store";

/**
 * GET /slack/oauth_redirect
 *
 * Handles the OAuth callback from Slack after user authorization.
 * Exchanges the code for tokens and stores the installation in the database.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const code = query.code as string | undefined;
  const state = query.state as string | undefined;
  const error = query.error as string | undefined;

  // Handle user cancellation
  if (error) {
    return sendRedirect(
      event,
      `/slack/install/error?message=${encodeURIComponent(error)}`
    );
  }

  // Validate required parameters
  if (!code || !state) {
    setResponseStatus(event, 400);
    return { error: "Missing code or state parameter" };
  }

  // Verify the state parameter matches what we set in the cookie
  const storedState = getCookie(event, "slack_oauth_state");
  if (!storedState || storedState !== state || !verifyOAuthState(state)) {
    setResponseStatus(event, 403);
    return { error: "Invalid or expired OAuth state" };
  }

  // Clear the state cookie
  deleteCookie(event, "slack_oauth_state", { path: "/" });

  try {
    const result = await exchangeCodeForToken(code);

    if (!result.ok || !result.authed_user) {
      setResponseStatus(event, 400);
      return {
        error: "OAuth token exchange failed",
        detail: result.error ?? "No authed_user in response",
      };
    }

    const { authed_user, team, enterprise, app_id } = result;

    if (!team?.id) {
      setResponseStatus(event, 400);
      return { error: "No team ID in OAuth response" };
    }

    // Store the installation in the database
    await storeInstallation({
      teamId: team.id,
      userId: authed_user.id,
      userToken: authed_user.access_token,
      userScopes: authed_user.scope,
      appId: app_id,
      enterpriseId: enterprise?.id,
      tokenType: authed_user.token_type,
    });

    // Return a simple success page
    return `
      <!DOCTYPE html>
      <html>
        <head><title>Installation Complete</title></head>
        <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8f9fa;">
          <div style="text-align: center; max-width: 400px; padding: 2rem;">
            <h1 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Installation Complete</h1>
            <p style="color: #666;">You can now close this window and return to Slack. The agent now has access to enhanced MCP tools on your behalf.</p>
          </div>
        </body>
      </html>
    `;
  } catch (err) {
    console.error("OAuth callback error:", err);
    setResponseStatus(event, 500);
    return { error: "Internal server error during OAuth callback" };
  }
});
