import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type { ModelMessage } from "ai";
import { streamMessage } from "~/lib/ai/respond-to-message";
import {
  getThreadContextAsModelMessage,
  handleMessageStream,
} from "~/lib/slack/utils";

export const directMessageCallback = async ({
  message,
  event,
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
      messages = await getThreadContextAsModelMessage({
        channel,
        ts: thread_ts,
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
    const { fullStream } = streamMessage({
      messages,
      event,
      channel,
      thread_ts,
      botId,
    });

    handleMessageStream({
      channel,
      thread_ts,
      fullStream,
      statusMap: {
        "reasoning-start": "is thinking...",
        "reasoning-delta": "is thinking...",
        start: "is thinking...",
        finish: "",
        "text-end": "",
        getThreadMessagesTool: "is reading thread...",
        getChannelMessagesTool: "is reading channel...",
      },
    });
  } catch (error) {
    logger.error("DM handler failed:", error);
    await say({
      text: "Sorry, something went wrong processing your message. Please try again.",
      thread_ts: thread_ts || message.ts,
    });
  }
};
