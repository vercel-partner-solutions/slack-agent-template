import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type { ModelMessage } from "ai";
import { respondToMessage } from "~/lib/ai/respond-to-message";
import { getChannelContextAsModelMessage } from "~/lib/slack/get-channel-context";
import { getThreadContextAsModelMessage } from "~/lib/slack/get-thread-context";

const appMentionCallback = async ({
  event,
  say,
  logger,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"app_mention">) => {
  logger.debug("App mentioned:", JSON.stringify(event, null, 2));

  let context: ModelMessage[] = [];

  try {
    if ("thread_ts" in event && event.thread_ts) {
      context = await getThreadContextAsModelMessage(
        event.thread_ts,
        event.channel,
      );
    } else {
      context = await getChannelContextAsModelMessage(event.channel);
    }
  } catch (error) {
    logger.error("Failed to get context, using message as fallback:", error);
    context = [{ role: "user", content: event.text }];
  }

  const response = await respondToMessage(context);
  await say({
    text: response,
    thread_ts: event.thread_ts || event.ts,
  });
};

export default appMentionCallback;
