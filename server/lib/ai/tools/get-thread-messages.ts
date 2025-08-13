import { tool } from "ai";
import { z } from "zod";
import { app } from "~/app";
import { getThreadContextAsModelMessage } from "~/lib/slack/utils";
import type { ExperimentalContext } from "../respond-to-message";

export const getThreadMessagesTool = tool({
  name: "get_thread_messages",
  description:
    "Get the messages from a Slack thread. This will help you understand the context of the thread conversation.",
  inputSchema: z.object({}),
  execute: async (_, { experimental_context }) => {
    try {
      const { channelId, threadTs, botId } =
        experimental_context as ExperimentalContext;

      return await getThreadContextAsModelMessage({
        thread_ts: threadTs,
        channel_id: channelId,
        botId,
      });
    } catch (error) {
      app.logger.error("Failed to get thread messages:", error);
      return [];
    }
  },
});
