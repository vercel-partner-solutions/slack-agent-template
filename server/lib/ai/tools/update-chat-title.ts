import { tool } from "ai";
import { z } from "zod";
import { app } from "~/app";
import type { ExperimentalContext } from "../respond-to-message";

export const updateChatTitleTool = tool({
  name: "update_chat_title",
  description: "Update the title of the chat",
  inputSchema: z.object({
    title: z.string().describe("The new title of the chat"),
  }),
  execute: async ({ title }, { experimental_context }) => {
    try {
      const { channelId, threadTs } =
        experimental_context as ExperimentalContext;

      if (!channelId || !threadTs) {
        app.logger.warn(
          "update_chat_title skipped: missing channelId/threadTs",
        );
        return;
      }

      app.client.assistant.threads.setTitle({
        channel_id: channelId,
        thread_ts: threadTs,
        title,
      });
    } catch (error) {
      app.logger.error("Failed to update chat title:", error);
    }
  },
});
