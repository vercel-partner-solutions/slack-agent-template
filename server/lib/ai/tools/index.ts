import { z } from "zod";

export * from "./get-channel-messages";
export * from "./get-thread-messages";
export * from "./join-channel";

export const SlackToolsSchema = z.enum([
  "getChannelMessagesTool",
  "getThreadMessagesTool",
  "joinChannelTool",
]);

export type SlackTools = z.infer<typeof SlackToolsSchema>;
