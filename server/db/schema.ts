import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const slackWorkspaces = pgTable("slack_workspaces", {
  id: serial("id").primaryKey(),
  teamId: text("team_id").unique(),
  teamName: text("team_name"),
  enterpriseId: text("enterprise_id").unique(),
  enterpriseName: text("enterprise_name"),
  enterpriseUrl: text("enterprise_url"),
  isEnterpriseInstall: boolean("is_enterprise_install")
    .notNull()
    .default(false),
  appId: text("app_id"),
  botUserId: text("bot_user_id"),
  botToken: text("bot_token"),
  botRefreshToken: text("bot_refresh_token"),
  botTokenExpiresAt: timestamp("bot_token_expires_at"),
  botScopes: text("bot_scopes").array(),
  incomingWebhookUrl: text("incoming_webhook_url"),
  incomingWebhookChannel: text("incoming_webhook_channel"),
  incomingWebhookChannelId: text("incoming_webhook_channel_id"),
  incomingWebhookConfigUrl: text("incoming_webhook_config_url"),
  authVersion: text("auth_version"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const slackUserInstallations = pgTable(
  "slack_user_installations",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => slackWorkspaces.id, { onDelete: "cascade" }),
    slackUserId: text("slack_user_id").notNull(),
    userToken: text("user_token"),
    userRefreshToken: text("user_refresh_token"),
    userTokenExpiresAt: timestamp("user_token_expires_at"),
    userScopes: text("user_scopes").array(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("workspace_user_idx").on(table.workspaceId, table.slackUserId),
  ],
);

export type SlackWorkspace = typeof slackWorkspaces.$inferSelect;
export type NewSlackWorkspace = typeof slackWorkspaces.$inferInsert;
export type SlackUserInstallation = typeof slackUserInstallations.$inferSelect;
export type NewSlackUserInstallation =
  typeof slackUserInstallations.$inferInsert;
