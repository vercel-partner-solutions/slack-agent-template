import { tool } from "ai";
import { z } from "zod";
import { app } from "~/app";
import { getThreadContextAsModelMessage } from "~/lib/slack/utils";

export const getThreadMessagesTool = tool({
  description:
    "Get the messages from the current conversation thread. This retrieves the conversation history between you and the user.",
  inputSchema: z.object({
    dm_channel: z
      .string()
      .describe("The DM channel ID where this thread lives"),
    thread_ts: z.string().describe("The thread timestamp"),
  }),
  execute: async ({ dm_channel, thread_ts }) => {
    try {
      return await getThreadContextAsModelMessage({
        channel: dm_channel,
        ts: thread_ts,
      });
    } catch (error) {
      app.logger.error("Failed to get thread messages:", error);
      return [];
    }
  },
});
