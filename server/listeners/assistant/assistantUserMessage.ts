import type { AssistantUserMessageMiddleware } from "@slack/bolt";
import type { ModelMessage } from "ai";
import { createSlackAgent } from "~/lib/ai/agent";
import { feedbackBlock } from "~/lib/slack/blocks";
import { getThreadContextAsModelMessage } from "~/lib/slack/utils";

export const assistantUserMessage: AssistantUserMessageMiddleware = async ({
  client,
  context,
  logger,
  message,
  say,
  getThreadContext,
}) => {
  /**
   * Messages sent to the Assistant can have a specific message subtype.
   *
   * Here we check that the message has "text" and was sent to a thread to
   * skip unexpected message subtypes.
   *
   * @see {@link https://docs.slack.dev/reference/events/message#subtypes}
   */
  if (
    !("text" in message) ||
    !("thread_ts" in message) ||
    !message.text ||
    !message.thread_ts
  ) {
    return;
  }
  const { thread_ts, text } = message;
  const { userId, botId } = context;
  const { channel_id, team_id } = await getThreadContext();

  let messages: ModelMessage[] = [];
  try {
    messages = await getThreadContextAsModelMessage({
      channel: channel_id,
      ts: thread_ts,
      botId,
    });

    const agent = createSlackAgent({
      bot_id: botId,
      user_id: userId,
      team_id: team_id,
      channel_id: channel_id,
      thread_ts: thread_ts,
      event: message,
    });

    const stream = await agent.stream({
      messages,
    });

    const streamer = client.chatStream({
      channel: channel_id,
      thread_ts: thread_ts || message.ts,
      recipient_team_id: team_id,
      recipient_user_id: userId,
    });

    for await (const chunk of stream.textStream) {
      await streamer.append({
        markdown_text: chunk,
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
