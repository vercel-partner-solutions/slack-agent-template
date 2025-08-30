import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type {
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

export const updateAgentStatus = async ({
  channel,
  thread_ts,
  status,
}: {
  channel: string;
  thread_ts: string;
  status: string;
}) => {
  try {
    await app.client.assistant.threads.setStatus({
      channel_id: channel,
      thread_ts,
      status,
    });
  } catch (error) {
    app.logger.error("Failed to update agent status", {
      channel,
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

export const addReaction = async ({
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

export const removeReaction = async ({
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

/**
 * Higher-level API for managing message processing state reactions
 */
export const MessageState = {
  /**
   * Mark a message as being processed by adding an hourglass reaction
   */
  setProcessing: async ({
    channel,
    timestamp,
  }: {
    channel: string;
    timestamp: string;
  }) => {
    await addReaction({
      channel,
      timestamp,
      name: "hourglass_flowing_sand",
    });
  },

  /**
   * Mark a message as successfully processed by replacing hourglass with checkmark
   */
  setCompleted: async ({
    channel,
    timestamp,
  }: {
    channel: string;
    timestamp: string;
  }) => {
    await removeReaction({
      channel,
      timestamp,
      name: "hourglass_flowing_sand",
    });
    await addReaction({
      channel,
      timestamp,
      name: "white_check_mark",
    });
  },

  /**
   * Mark a message as failed by replacing hourglass with error mark
   */
  setError: async ({
    channel,
    timestamp,
  }: {
    channel: string;
    timestamp: string;
  }) => {
    await removeReaction({
      channel,
      timestamp,
      name: "hourglass_flowing_sand",
    });
    await addReaction({
      channel,
      timestamp,
      name: "x",
    });
  },
};
