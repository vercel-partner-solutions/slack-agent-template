import { tool } from "ai";
import { z } from "zod";
import { app } from "~/app";

export const joinChannelTool = tool({
  description:
    "Join a public Slack channel. Use this when you need to access a channel's messages but aren't a member yet. Only works for public channels.",
  inputSchema: z.object({
    channel_id: z
      .string()
      .describe("The Slack channel ID to join (e.g., C0A2NKEHLLV)"),
  }),
  execute: async ({ channel_id }) => {
    try {
      const result = await app.client.conversations.join({
        channel: channel_id,
      });

      if (result.ok) {
        return {
          success: true,
          message: `Successfully joined channel ${
            result.channel?.name || channel_id
          }`,
          channel: result.channel,
        };
      }

      return {
        success: false,
        message: "Failed to join channel",
        error: result.error,
      };
    } catch (error) {
      app.logger.error("Failed to join channel:", error);
      return {
        success: false,
        message: "Failed to join channel",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
