import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type { ModelMessage } from "ai";
import { createTextStream } from "~/lib/ai/respond-to-message";
import { feedbackBlock } from "~/lib/slack/blocks";
import {
  getThreadContextAsModelMessage,
  updateAgentStatus,
} from "~/lib/slack/utils";

export const directMessageCallback = async ({
  message,
  event,
  client,
  logger,
  context,
  say,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"message">) => {
  // @ts-expect-error
  const { channel, thread_ts, text } = message;
  const { botId, userId, teamId } = context;

  if (!text) return;

  let messages: ModelMessage[] = [];
  try {
    if (thread_ts) {
      updateAgentStatus({
        channel_id: channel,
        thread_ts,
        status: "is typing...",
        loading_messages: ["is thinking..."],
      });
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

    const textStream = await createTextStream({
      messages,
      channel,
      thread_ts,
      botId,
      event,
    });

    const streamer = client.chatStream({
      channel: channel,
      thread_ts: thread_ts || message.ts,
      recipient_team_id: teamId,
      recipient_user_id: userId,
    });

    for await (const text of textStream) {
      await streamer.append({
        markdown_text: text,
      });
    }

    await streamer.stop({
      blocks: [feedbackBlock({ thread_ts: thread_ts })],
    });
  } catch (error) {
    logger.error("DM handler failed:", error);
    try {
      await say({
        text: "Sorry, something went wrong processing your message. Please try again.",
        thread_ts: thread_ts || message.ts,
      });
    } catch (error) {
      logger.error("Failed to send error response:", error);
    }
  }
};
