import { tool } from "ai";
import { z } from "zod";
import { app } from "~/app";
import { getChannelContextAsModelMessage } from "~/lib/slack/utils";

export const getChannelMessagesTool = tool({
  description:
    "Get the messages from a Slack channel. Use this to understand the context of a channel conversation. Pass the channel_id of the channel you want to read.",
  inputSchema: z.object({
    channel_id: z
      .string()
      .describe(
        "The Slack channel ID to fetch messages from (e.g., C0A2NKEHLLV)"
      ),
  }),
  execute: async ({ channel_id }) => {
    try {
      return await getChannelContextAsModelMessage({
        channel: channel_id,
      });
    } catch (error) {
      app.logger.error("Failed to get channel messages:", error);
      return [];
    }
  },
});
