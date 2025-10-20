import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type {
  AssistantThreadsSetStatusArguments,
  ConversationsHistoryArguments,
  ConversationsRepliesArguments,
} from "@slack/web-api";
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

// Slack only allows up to 10 loading messages
const formatLoadingMessages = (loadingMessages: string[]): string[] => {
  return loadingMessages.slice(0, 10);
};

export const updateAgentStatus = async ({
  channel_id,
  thread_ts,
  status,
  loading_messages,
}: AssistantThreadsSetStatusArguments) => {
  try {
    await app.client.assistant.threads.setStatus({
      channel_id,
      thread_ts,
      status,
      loading_messages: formatLoadingMessages(loading_messages),
    });
  } catch (error) {
    app.logger.error("Failed to update agent status", {
      channel_id,
      thread_ts,
      status,
      error,
    });
  }
};

// Extend the ModelMessage type with Slack-specific metadata to identify multiple users in the same thread
export type SlackUIMessage = ModelMessage & {
  metadata?: MessageElement;
};

const getThreadContext = async (args: ConversationsRepliesArguments) => {
  const thread = await app.client.conversations.replies(args);

  return thread.messages || [];
};

export const getThreadContextAsModelMessage = async (
  args: ConversationsRepliesArguments & { botId: string },
): Promise<SlackUIMessage[]> => {
  const { botId } = args;
  const messages = await getThreadContext(args);

  return messages.map((message) => {
    const { bot_id, text, user, ts, thread_ts, type } = message;
    return {
      role: bot_id === botId ? "assistant" : "user",
      content: text,
      metadata: {
        user: user || null,
        bot_id: bot_id || null,
        ts,
        thread_ts,
        type,
      },
    };
  });
};

const getChannelContext = async (args: ConversationsHistoryArguments) => {
  const history = await app.client.conversations.history(args);
  return history.messages || [];
};

export const getChannelContextAsModelMessage = async (
  args: ConversationsHistoryArguments & { botId: string },
): Promise<SlackUIMessage[]> => {
  const { botId } = args;
  const messages = await getChannelContext(args);

  return messages.map((message) => {
    const { bot_id, text, user, ts, thread_ts, type } = message;
    return {
      role: bot_id === botId ? "assistant" : "user",
      content: text,
      metadata: {
        user: user || null,
        bot_id: bot_id || null,
        ts,
        thread_ts,
        type,
      },
    };
  });
};

export const addEmoji = async ({
  channel,
  timestamp,
  name,
}: {
  channel: string;
  timestamp: string;
  name: string;
}) => {
  try {
    await app.client.reactions.add({
      channel,
      timestamp,
      name,
    });
  } catch (error) {
    app.logger.warn(`Failed to add reaction ${name}:`, error);
  }
};

export const removeEmoji = async ({
  channel,
  timestamp,
  name,
}: {
  channel: string;
  timestamp: string;
  name: string;
}) => {
  try {
    await app.client.reactions.remove({
      channel,
      timestamp,
      name,
    });
  } catch (error) {
    app.logger.warn(`Failed to remove reaction ${name}:`, error);
  }
};
