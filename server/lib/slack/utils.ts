import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type { MessageElement } from "@slack/web-api/dist/types/response/ConversationsHistoryResponse";
import type { ModelMessage } from "ai";
import { app } from "~/app";

/**
 * Helper function to create a middleware that only runs a callback if the message
 * is in a specific Slack channel type.
 *
 * @example
 * app.message(onlyChannelType("im"), directMessageCallback);
 *
 * @param {SlackEventMiddlewareArgs<"message">["event"]["channel_type"]} type - The Slack channel type to filter for ("im", "group", "mpim", "channel").
 * @returns {Function} Middleware function that only calls next() if the event's channel_type matches the specified type.
 */
export const onlyChannelType =
  (type: SlackEventMiddlewareArgs<"message">["event"]["channel_type"]) =>
  /**
   * Middleware that proceeds only when the incoming message is in the specified channel type.
   *
   * Channel types include: "im" (DM), "group" (private channel), "mpim" (multi-person DM), and "channel" (public channel).
   *
   * @param {SlackEventMiddlewareArgs<"message"> & AllMiddlewareArgs} args - Handler args containing the Slack event and next callback.
   * @returns {Promise<void>} Resolves after conditionally calling `next()`.
   */
  async ({
    event,
    next,
  }: SlackEventMiddlewareArgs<"message"> & AllMiddlewareArgs) => {
    if (event.channel_type === type) {
      await next();
    }
  };

/**
 * Update the Slack Assistant thread status for a specific thread.
 *
 * This sets the visual status (for example: "thinking", "responding", "idle") on the thread.
 *
 * @param {object} params - Parameters for the status update.
 * @param {string} params.channelId - The ID of the channel that contains the thread.
 * @param {string} params.threadTs - The timestamp of the root message for the thread.
 * @param {string} params.status - The status string to set for the thread.
 * @returns {Promise<void>} Resolves when the status has been updated.
 */
export const updateAgentStatus = async ({
  channelId,
  threadTs,
  status,
}: {
  channelId: string;
  threadTs: string;
  status: string;
}) => {
  try {
    await app.client.assistant.threads.setStatus({
      channel_id: channelId,
      thread_ts: threadTs,
      status,
    });
  } catch (error) {
    app.logger.error("Failed to update agent status", {
      channelId,
      threadTs,
      status,
      error,
    });
  }
};

// Extend the ModelMessage type with Slack-specific metadata to identify multiple users in the same thread
export type SlackUIMessage = ModelMessage & {
  metadata?: MessageElement;
};

/**
 * Fetch up to the latest 50 messages from a thread.
 *
 * @param {string} thread_ts - Timestamp of the root message of the thread.
 * @param {string} channel_id - Channel ID where the thread exists.
 * @returns {Promise<Array<{ text?: string; bot_id?: string }>>} The list of messages in the thread (empty array if none).
 * @internal
 */
const getThreadContext = async (thread_ts: string, channel_id: string) => {
  const thread = await app.client.conversations.replies({
    channel: channel_id,
    ts: thread_ts,
    limit: 50,
  });

  return thread.messages || [];
};

/**
 * Retrieve a thread's messages and convert them into `SlackUIMessage[]` for AI processing.
 *
 * The role is inferred by comparing each message's `bot_id` with the provided `botId`.
 *
 * @param {string} thread_ts - Timestamp of the root message of the thread.
 * @param {string} channel_id - Channel ID where the thread exists.
 * @param {string} botId - The current app's bot ID used to determine message role.
 * @returns {Promise<SlackUIMessage[]>} Messages formatted for AI model consumption.
 */
export const getThreadContextAsModelMessage = async ({
  thread_ts,
  channel_id,
  botId,
}: {
  thread_ts: string;
  channel_id: string;
  botId: string;
}): Promise<SlackUIMessage[]> => {
  const messages = await getThreadContext(thread_ts, channel_id);

  return messages.map((message) => ({
    role: message.bot_id === botId ? "assistant" : "user",
    content: message.text,
    metadata: {
      user: message.user || null,
      bot_id: message?.bot_id || null,
      ts: message.ts,
      thread_ts: message.thread_ts,
      type: message.type,
    },
  }));
};

/**
 * Fetch recent messages from a channel (non-threaded history).
 *
 * @param {string} channel_id - Channel ID to read from.
 * @returns {Promise<Array<{ text?: string; bot_id?: string }>>} The list of recent messages (empty array if none).
 * @internal
 */
const getChannelContext = async (channel_id: string) => {
  const history = await app.client.conversations.history({
    channel: channel_id,
    limit: 15,
  });

  return history.messages || [];
};

/**
 * Retrieve recent channel messages and convert them into `SlackUIMessage[]` for AI processing.
 *
 * The role is inferred by comparing each message's `bot_id` with the provided `botId`.
 *
 * @param {string} channel_id - Channel ID to read from.
 * @param {string} botId - The current app's bot ID used to determine message role.
 * @returns {Promise<SlackUIMessage[]>} Messages formatted for AI model consumption.
 */
export const getChannelContextAsModelMessage = async (
  channel_id: string,
  botId: string,
): Promise<SlackUIMessage[]> => {
  const messages = await getChannelContext(channel_id);

  return messages.map((message) => ({
    role: message.bot_id === botId ? "assistant" : "user",
    content: message.text,
    metadata: {
      user: message.user || null,
      bot_id: message?.bot_id || null,
      ts: message.ts,
      thread_ts: message.thread_ts,
      type: message.type,
    },
  }));
};
