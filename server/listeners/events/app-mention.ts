import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type { ModelMessage } from "ai";
import { respondToMessage } from "~/lib/ai/respond-to-message";
import { getChannelContextAsModelMessage } from "~/lib/slack/get-channel-context";
import { getThreadContextAsModelMessage } from "~/lib/slack/get-thread-context";

const appMentionCallback = async ({
  event,
  say,
  logger,
  context,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"app_mention">) => {
  logger.debug("App mentioned:", JSON.stringify(event, null, 2));

  let threadContext: ModelMessage[] = [];

  try {
    if ("thread_ts" in event && event.thread_ts) {
      threadContext = await getThreadContextAsModelMessage(
        event.thread_ts,
        event.channel,
        context.botId,
      );
    } else {
      threadContext = await getChannelContextAsModelMessage(
        event.channel,
        context.botId,
      );
    }
  } catch (error) {
    logger.error("Failed to get context, using message as fallback:", error);
    threadContext = [{ role: "user", content: event.text }];
  }

  const response = await respondToMessage(threadContext);
  await say({
    text: response,
    thread_ts: event.thread_ts || event.ts,
  });
};

export default appMentionCallback;
