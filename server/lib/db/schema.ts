import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";

/**
 * Stores Slack OAuth installations per team+user.
 *
 * Each row represents one user's OAuth grant in a specific workspace.
 * The `user_token` is the `xoxp-...` token used to authenticate with
 * Slack's MCP server on behalf of that user.
 */
export const slackInstallations = pgTable(
  "slack_installations",
  {
    teamId: text("team_id").notNull(),
    userId: text("user_id").notNull(),
    userToken: text("user_token").notNull(),
    /** Optional: store the bot token from the same installation */
    botToken: text("bot_token"),
    /** Scopes granted by the user */
    userScopes: text("user_scopes"),
    /** Slack app ID for reference */
    appId: text("app_id"),
    /** Enterprise org ID (for Enterprise Grid installs) */
    enterpriseId: text("enterprise_id"),
    /** Token type (usually "user") */
    tokenType: text("token_type"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.teamId, table.userId] })]
);

export type SlackInstallation = typeof slackInstallations.$inferSelect;
export type NewSlackInstallation = typeof slackInstallations.$inferInsert;
