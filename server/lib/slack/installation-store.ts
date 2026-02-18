import { eq, and } from "drizzle-orm";
import { db } from "~/lib/db";
import { slackInstallations } from "~/lib/db/schema";

/**
 * Retrieves the user OAuth token for a specific team + user combination.
 * Returns the `xoxp-...` token needed for Slack's MCP server, or null if not found.
 */
export async function getUserToken(
  teamId: string,
  userId: string
): Promise<string | null> {
  const [installation] = await db
    .select({ userToken: slackInstallations.userToken })
    .from(slackInstallations)
    .where(
      and(
        eq(slackInstallations.teamId, teamId),
        eq(slackInstallations.userId, userId)
      )
    )
    .limit(1);

  return installation?.userToken ?? null;
}

/**
 * Stores or updates a user's OAuth installation.
 * Uses upsert (INSERT ... ON CONFLICT UPDATE) to handle re-authorizations.
 */
export async function storeInstallation(params: {
  teamId: string;
  userId: string;
  userToken: string;
  botToken?: string;
  userScopes?: string;
  appId?: string;
  enterpriseId?: string;
  tokenType?: string;
}) {
  await db
    .insert(slackInstallations)
    .values({
      teamId: params.teamId,
      userId: params.userId,
      userToken: params.userToken,
      botToken: params.botToken,
      userScopes: params.userScopes,
      appId: params.appId,
      enterpriseId: params.enterpriseId,
      tokenType: params.tokenType,
    })
    .onConflictDoUpdate({
      target: [slackInstallations.teamId, slackInstallations.userId],
      set: {
        userToken: params.userToken,
        botToken: params.botToken,
        userScopes: params.userScopes,
        appId: params.appId,
        enterpriseId: params.enterpriseId,
        tokenType: params.tokenType,
        updatedAt: new Date(),
      },
    });
}

/**
 * Deletes a user's OAuth installation (e.g., on app_uninstalled or tokens_revoked).
 */
export async function deleteInstallation(teamId: string, userId: string) {
  await db
    .delete(slackInstallations)
    .where(
      and(
        eq(slackInstallations.teamId, teamId),
        eq(slackInstallations.userId, userId)
      )
    );
}
