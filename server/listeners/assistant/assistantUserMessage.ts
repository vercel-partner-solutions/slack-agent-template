import type { AssistantUserMessageMiddleware } from "@slack/bolt";
import type { ModelMessage } from "ai";
import { start } from "workflow/api";
import { chatWorkflow } from "~/lib/ai/workflows/chat";
import { getThreadContextAsModelMessage } from "~/lib/slack/utils";

export const assistantUserMessage: AssistantUserMessageMiddleware = async ({
  client,
  context,
  logger,
  message,
  say,
  getThreadContext,
  setStatus,
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
  await setStatus("is thinking...");
  const { thread_ts, channel } = message;
  const { userId, botId, teamId } = context;
  // channel_id is the channel the user was viewing when they opened Assistant (for context)
  // channel is the actual DM channel where the thread lives
  const { channel_id: context_channel_id } = await getThreadContext();

  // Determine if this is a DM (channel type starts with 'D')
  const is_dm = channel.startsWith("D");

  let messages: ModelMessage[] = [];
  try {
    messages = await getThreadContextAsModelMessage({
      channel, // Use the actual DM channel, not the context channel
      ts: thread_ts,
      botId,
      client,
    });

    const run = await start(chatWorkflow, [
      messages,
      {
        channel_id: context_channel_id, // The channel user was viewing (for fetching channel context)
        dm_channel: channel, // The DM channel where the thread lives
        thread_ts: thread_ts,
        is_dm,
        team_id: teamId ?? "", // The workspace team_id for API calls
        bot_id: botId,
        client,
      },
    ]);

    const streamer = client.chatStream({
      channel, // Use the actual DM channel for streaming
      thread_ts: thread_ts || message.ts,
      recipient_team_id: teamId,
      recipient_user_id: userId,
    });

    for await (const chunk of run.readable) {
      if (chunk.type === "text-delta") {
        await streamer.append({
          markdown_text: chunk.textDelta,
        });
      }
    }

    await streamer.stop();
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
  } finally {
    await setStatus("");
  }
};
