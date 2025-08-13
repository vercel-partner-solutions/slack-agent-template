import { tool } from "ai";
import { z } from "zod";
import { app } from "~/app";
import type { ExperimentalContext } from "../respond-to-message";

export const updateAgentStatusTool = tool({
  name: "update_agent_status",
  description: "Update the status of the agent",
  inputSchema: z.object({
    status: z
      .string()
      .describe(
        `The status of the agent. This should be a very short description of what the agent is doing. Example: 'is reading thread...', 
        'is reading channel...', 'is thinking...', 'is responding...'`,
      )
      .min(15)
      .max(30),
  }),
  execute: async ({ status }, { experimental_context }) => {
    try {
      const { channelId, threadTs } =
        experimental_context as ExperimentalContext;

      if (threadTs) {
        app.client.assistant.threads.setStatus({
          channel_id: channelId,
          thread_ts: threadTs,
          status,
        });
      } else {
        app.logger.warn("update_agent_status called without thread_ts");
      }
    } catch (error) {
      app.logger.error("Failed to update agent status:", error);
    }
  },
});
