import { tool } from "ai";
import { z } from "zod";
import { app } from "~/app";
import { getChannelContextAsModelMessage } from "~/lib/slack/utils";
import type { ExperimentalContext } from "../respond-to-message";

export const getChannelMessagesTool = tool({
  name: "get_channel_messages",
  description:
    "Get the messages from a Slack channel. This will help you understand the context of the channel conversation.",
  inputSchema: z.object({}),
  execute: async (_, { experimental_context }) => {
    try {
      const { channelId, botId } = experimental_context as ExperimentalContext;

      return await getChannelContextAsModelMessage(channelId, botId);
    } catch (error) {
      app.logger.error("Failed to get channel messages:", error);
      return [];
    }
  },
});
