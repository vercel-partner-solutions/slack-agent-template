import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type { ModelMessage } from "ai";
import { respondToMessage } from "~/lib/ai/respond-to-message";
import { getChannelContextAsModelMessage } from "~/lib/slack/get-channel-context";
import { getThreadContextAsModelMessage } from "~/lib/slack/get-thread-context";

const groupMessageCallback = async ({
  message,
  event,
  say,
  logger,
  client,
}: SlackEventMiddlewareArgs<"message"> & AllMiddlewareArgs) => {
  if (
    event.channel_type === "group" &&
    "text" in message &&
    typeof message.text === "string"
  ) {
    logger.debug("Group message event received:", event);

    let context: ModelMessage[] = [];

    try {
      if ("thread_ts" in message && message.thread_ts) {
        client.assistant.threads.setStatus({
          channel_id: message.channel,
          thread_ts: message.thread_ts,
          status: "is typing...",
        });

        context = await getThreadContextAsModelMessage(
          message.thread_ts,
          message.channel,
        );
      } else {
        context = await getChannelContextAsModelMessage(message.channel);
      }
    } catch (error) {
      logger.error("Failed to get context, using message as fallback:", error);
      context = [{ role: "user", content: message.text }];
    }
    const response = await respondToMessage(context);

    await say({
      text: response,
      thread_ts: message.ts,
    });
  } else {
    logger.debug("Group message received with no text");
  }
};

export default groupMessageCallback;
