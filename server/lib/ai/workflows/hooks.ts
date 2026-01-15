import { defineHook } from "workflow";
import { z } from "zod";

/**
 * Human-in-the-loop hook for channel join approval.
 *
 * This hook pauses the workflow until a user approves or rejects
 * the agent's request to join a Slack channel.
 */
export const channelJoinApprovalHook = defineHook({
  schema: z.object({
    approved: z.boolean(),
    channelId: z.string(),
    channelName: z.string().optional(),
  }),
});
