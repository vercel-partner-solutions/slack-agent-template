export * from "./get-channel-messages";
export * from "./get-thread-messages";
export * from "./update-agent-status";
export * from "./update-chat-title";

import type { KnownEventFromType } from "@slack/bolt";
import { z } from "zod";
import { app } from "~/app";

export const availableToolsSchema = z.enum([
  "getChannelMessagesTool",
  "getThreadMessagesTool",
  "updateAgentStatusTool",
  "updateChatTitleTool",
]);

export type AvailableToolNames = z.infer<typeof availableToolsSchema>;
export const availableTools = availableToolsSchema.options;

export type ChannelTypes = "channel" | "group" | "im" | "mpim" | "app_home";

export const SUPPORTED_CHANNEL_TYPES: ChannelTypes[] = [
  "channel",
  "group",
  "mpim",
];

export const getActiveTools = (
  event: KnownEventFromType<"message"> | KnownEventFromType<"app_mention">
): AvailableToolNames[] => {
  const tools = new Set<AvailableToolNames>();
  const channelType = "channel_type" in event ? event.channel_type : null;
  const hasThread = "thread_ts" in event && event.thread_ts;
  const isDirectMessage =
    "channel_type" in event && event.channel_type === "im";

  // Add channel messages tool for supported channel types
  if (channelType && SUPPORTED_CHANNEL_TYPES.includes(channelType)) {
    app.logger.debug(
      `${channelType} channel type detected, adding getChannelMessagesTool`
    );
    tools.add("getChannelMessagesTool");
  }

  // Add thread tools
  if (hasThread) {
    app.logger.debug(`thread_ts detected, adding getThreadMessagesTool`);
    tools.add("getThreadMessagesTool");
    app.logger.debug(`thread_ts detected, adding updateAgentStatusTool`);
    tools.add("updateAgentStatusTool");
  }

  // Add DM tools
  if (isDirectMessage) {
    app.logger.debug(`direct message detected, adding updateChatTitleTool`);
    tools.add("updateChatTitleTool");
  }

  app.logger.debug("Active tools:", tools);
  return Array.from(tools);
};
