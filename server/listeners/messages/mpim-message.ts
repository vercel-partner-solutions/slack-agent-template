import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type { ModelMessage } from "ai";
import { respondToMessage } from "~/lib/ai/respond-to-message";
import { getChannelContextAsModelMessage } from "~/lib/slack/get-channel-context";
import { getThreadContextAsModelMessage } from "~/lib/slack/get-thread-context";

const mpimMessageCallback = async ({
  message,
  event,
  say,
  logger,
  client,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"message">) => {
  if (
    event.channel_type === "mpim" &&
    "text" in message &&
    typeof message.text === "string"
  ) {
    logger.debug("MPIM message event received:", event);

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
    logger.debug("MPIM message received with no text");
  }
};

export default mpimMessageCallback;
