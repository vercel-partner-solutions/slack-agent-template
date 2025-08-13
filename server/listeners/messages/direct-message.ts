import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type { ModelMessage } from "ai";
import { respondToMessage } from "~/lib/ai/respond-to-message";
import {
  getThreadContextAsModelMessage,
  updateAgentStatus,
} from "~/lib/slack/utils";

export const directMessageCallback = async ({
  message,
  say,
  logger,
  context,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"message">) => {
  // @ts-expect-error
  const { channel, thread_ts, text } = message;
  const { botId } = context;

  if (!text) return;

  let messages: ModelMessage[] = [];
  try {
    if (thread_ts) {
      updateAgentStatus({
        channelId: channel,
        threadTs: thread_ts,
        status: "is typing...",
      });
      messages = await getThreadContextAsModelMessage({
        channel_id: channel,
        thread_ts,
        botId,
      });
    } else {
      messages = [
        {
          role: "user",
          content: text,
        },
      ];
    }

    const response = await respondToMessage({
      messages,
      channel,
      thread_ts,
      botId,
      isDirectMessage: true,
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
      thread_ts: thread_ts || message.ts,
    });
  } catch (error) {
    logger.error("DM handler failed:", error);
    await say({
      text: "Sorry, something went wrong processing your message. Please try again.",
      thread_ts: thread_ts || message.ts,
    });
  }
};
