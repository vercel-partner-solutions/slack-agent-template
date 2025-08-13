import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type { ModelMessage } from "ai";
import { respondToMessage } from "~/lib/ai/respond-to-message";
import {
  getThreadContextAsModelMessage,
  updateAgentStatus,
} from "~/lib/slack/utils";

const appMentionCallback = async ({
  event,
  say,
  logger,
  context,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"app_mention">) => {
  try {
    const { channel, thread_ts } = event;

    let messages: ModelMessage[] = [];
    if (thread_ts) {
      updateAgentStatus({
        channelId: channel,
        threadTs: thread_ts,
        status: "is typing...",
      });
      messages = await getThreadContextAsModelMessage({
        channel_id: channel,
        thread_ts,
        botId: context.botId,
      });
    } else {
      messages = [
        {
          role: "user",
          content: event.text,
        },
      ];
    }

    const response = await respondToMessage({
      messages,
      channel,
      thread_ts,
      botId: context.botId,
    });

    await say({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: response,
          },
        },
      ],
      // It's important to keep the text property as a fallback for improper markdown
      text: response,
      thread_ts: event.thread_ts || event.ts,
    });
  } catch (error) {
    logger.error("app_mention handler failed:", error);
    await say({
      text: "Sorry, something went wrong processing your message. Please try again.",
      thread_ts: event.thread_ts || event.ts,
    });
  }
};

export default appMentionCallback;
