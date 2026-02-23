import type { Installation, InstallationQuery } from "@slack/bolt";
import { and, eq } from "drizzle-orm";
import { db } from "~/db";
import { slackUserInstallations, slackWorkspaces } from "~/db/schema";

export const installationStore = {
  storeInstallation: async (installation: Installation) => {
    const teamId = installation.isEnterpriseInstall
      ? null
      : (installation.team?.id ?? null);
    const enterpriseId = installation.enterprise?.id ?? null;

    const [workspace] = await db
      .insert(slackWorkspaces)
      .values({
        teamId,
        teamName: installation.team?.name ?? null,
        enterpriseId,
        enterpriseName: installation.enterprise?.name ?? null,
        enterpriseUrl: installation.enterpriseUrl ?? null,
        isEnterpriseInstall: installation.isEnterpriseInstall ?? false,
        appId: installation.appId ?? null,
        botUserId: installation.bot?.userId ?? null,
        botToken: installation.bot?.token ?? null,
        botRefreshToken: installation.bot?.refreshToken ?? null,
        botTokenExpiresAt: installation.bot?.expiresAt
          ? new Date(installation.bot.expiresAt * 1000)
          : null,
        botScopes: installation.bot?.scopes ?? null,
        incomingWebhookUrl: installation.incomingWebhook?.url ?? null,
        incomingWebhookChannel: installation.incomingWebhook?.channel ?? null,
        incomingWebhookChannelId:
          installation.incomingWebhook?.channelId ?? null,
        incomingWebhookConfigUrl:
          installation.incomingWebhook?.configurationUrl ?? null,
        authVersion: installation.authVersion ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: teamId ? slackWorkspaces.teamId : slackWorkspaces.enterpriseId,
        set: {
          teamName: installation.team?.name ?? null,
          enterpriseName: installation.enterprise?.name ?? null,
          enterpriseUrl: installation.enterpriseUrl ?? null,
          appId: installation.appId ?? null,
          botUserId: installation.bot?.userId ?? null,
          botToken: installation.bot?.token ?? null,
          botRefreshToken: installation.bot?.refreshToken ?? null,
          botTokenExpiresAt: installation.bot?.expiresAt
            ? new Date(installation.bot.expiresAt * 1000)
            : null,
          botScopes: installation.bot?.scopes ?? null,
          incomingWebhookUrl: installation.incomingWebhook?.url ?? null,
          incomingWebhookChannel: installation.incomingWebhook?.channel ?? null,
          incomingWebhookChannelId:
            installation.incomingWebhook?.channelId ?? null,
          incomingWebhookConfigUrl:
            installation.incomingWebhook?.configurationUrl ?? null,
          authVersion: installation.authVersion ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    await db
      .insert(slackUserInstallations)
      .values({
        workspaceId: workspace.id,
        slackUserId: installation.user.id,
        userToken: installation.user.token ?? null,
        userRefreshToken: installation.user.refreshToken ?? null,
        userTokenExpiresAt: installation.user.expiresAt
          ? new Date(installation.user.expiresAt * 1000)
          : null,
        userScopes: installation.user.scopes ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          slackUserInstallations.workspaceId,
          slackUserInstallations.slackUserId,
        ],
        set: {
          userToken: installation.user.token ?? null,
          userRefreshToken: installation.user.refreshToken ?? null,
          userTokenExpiresAt: installation.user.expiresAt
            ? new Date(installation.user.expiresAt * 1000)
            : null,
          userScopes: installation.user.scopes ?? null,
          updatedAt: new Date(),
        },
      });
  },

  fetchInstallation: async (
    query: InstallationQuery<boolean>,
  ): Promise<Installation> => {
    const workspaceWhere = query.isEnterpriseInstall
      ? eq(slackWorkspaces.enterpriseId, query.enterpriseId as string)
      : eq(slackWorkspaces.teamId, query.teamId as string);

    if (query.userId) {
      const row = await db
        .select()
        .from(slackWorkspaces)
        .innerJoin(
          slackUserInstallations,
          and(
            eq(slackUserInstallations.workspaceId, slackWorkspaces.id),
            eq(slackUserInstallations.slackUserId, query.userId),
          ),
        )
        .where(workspaceWhere)
        .limit(1)
        .then((rows) => rows[0]);

      if (!row) {
        throw new Error(
          `Installation not found for userId=${query.userId} teamId=${query.teamId}`,
        );
      }

      return buildInstallation(
        row.slack_workspaces,
        row.slack_user_installations,
      );
    }

    const workspace = await db
      .select()
      .from(slackWorkspaces)
      .where(workspaceWhere)
      .limit(1)
      .then((rows) => rows[0]);

    if (!workspace) {
      throw new Error(
        `Installation not found for teamId=${query.teamId} enterpriseId=${query.enterpriseId}`,
      );
    }

    return buildInstallation(workspace, null);
  },

  deleteInstallation: async (query: InstallationQuery<boolean>) => {
    const workspaceWhere = query.isEnterpriseInstall
      ? eq(slackWorkspaces.enterpriseId, query.enterpriseId as string)
      : eq(slackWorkspaces.teamId, query.teamId as string);

    if (query.userId) {
      const workspace = await db
        .select({ id: slackWorkspaces.id })
        .from(slackWorkspaces)
        .where(workspaceWhere)
        .limit(1)
        .then((rows) => rows[0]);

      if (workspace) {
        await db
          .delete(slackUserInstallations)
          .where(
            and(
              eq(slackUserInstallations.workspaceId, workspace.id),
              eq(slackUserInstallations.slackUserId, query.userId),
            ),
          );
      }
      return;
    }

    await db.delete(slackWorkspaces).where(workspaceWhere);
  },
};

function buildInstallation(
  workspace: typeof slackWorkspaces.$inferSelect,
  userInstallation: typeof slackUserInstallations.$inferSelect | null,
): Installation {
  return {
    team: workspace.teamId
      ? { id: workspace.teamId, name: workspace.teamName ?? "" }
      : undefined,
    enterprise: workspace.enterpriseId
      ? {
          id: workspace.enterpriseId,
          name: workspace.enterpriseName ?? "",
        }
      : undefined,
    enterpriseUrl: workspace.enterpriseUrl ?? undefined,
    isEnterpriseInstall: workspace.isEnterpriseInstall,
    appId: workspace.appId ?? undefined,
    authVersion: (workspace.authVersion as "v1" | "v2") ?? "v2",
    bot: workspace.botToken
      ? {
          id: workspace.botUserId ?? "",
          userId: workspace.botUserId ?? "",
          token: workspace.botToken,
          refreshToken: workspace.botRefreshToken ?? undefined,
          expiresAt: workspace.botTokenExpiresAt
            ? Math.floor(workspace.botTokenExpiresAt.getTime() / 1000)
            : undefined,
          scopes: workspace.botScopes ?? [],
        }
      : undefined,
    incomingWebhook: workspace.incomingWebhookUrl
      ? {
          url: workspace.incomingWebhookUrl,
          channel: workspace.incomingWebhookChannel ?? undefined,
          channelId: workspace.incomingWebhookChannelId ?? undefined,
          configurationUrl: workspace.incomingWebhookConfigUrl ?? undefined,
        }
      : undefined,
    user: {
      id: userInstallation?.slackUserId ?? "",
      token: userInstallation?.userToken ?? undefined,
      refreshToken: userInstallation?.userRefreshToken ?? undefined,
      expiresAt: userInstallation?.userTokenExpiresAt
        ? Math.floor(userInstallation.userTokenExpiresAt.getTime() / 1000)
        : undefined,
      scopes: userInstallation?.userScopes ?? undefined,
    },
  } as Installation;
}
