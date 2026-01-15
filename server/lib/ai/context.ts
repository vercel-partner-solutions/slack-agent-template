/** Serializable context that can be passed to workflows (no client instance) */
export type SlackAgentContextInput = {
  /** The channel user was viewing when opening Assistant (for fetching channel context) */
  channel_id?: string;
  /** The DM channel where the thread lives (for thread operations) */
  dm_channel: string;
  /** The thread timestamp */
  thread_ts: string;
  /** Whether this is a direct message conversation */
  is_dm: boolean;
  /** The team ID (workspace ID) for API calls */
  team_id: string;
  /** The bot ID to identify assistant messages */
  bot_id?: string;
  /** The Slack bot token for creating the client */
  token: string;
};
