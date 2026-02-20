import type {
  AssistantThreadsSetStatusArguments,
  ConversationsHistoryArguments,
  ConversationsRepliesArguments,
  WebClient,
} from "@slack/web-api";
import type { ModelMessage } from "ai";

// Slack only allows up to 10 loading messages
const formatLoadingMessages = (loadingMessages: string[]): string[] => {
  return loadingMessages.slice(0, 10);
};

export const updateAgentStatus = async ({
  client,
  channel_id,
  thread_ts,
  status,
  loading_messages,
}: AssistantThreadsSetStatusArguments & { client: WebClient }) => {
  try {
    await client.assistant.threads.setStatus({
      channel_id,
      thread_ts,
      status,
      loading_messages: formatLoadingMessages(loading_messages || []),
    });
  } catch (error) {
    console.error("Failed to update agent status", {
      channel_id,
      thread_ts,
      status,
      error,
    });
  }
};

// Slack-specific metadata carried alongside each message for multi-user thread context
export type SlackMessageMeta = {
  user: string | null;
  bot_id: string | null;
  ts?: string;
  thread_ts?: string;
  type?: string;
};

export type SlackUIMessage = ModelMessage & {
  metadata?: SlackMessageMeta;
};

const getThreadContext = async (
  args: ConversationsRepliesArguments,
  client: WebClient,
) => {
  const thread = await client.conversations.replies(args);

  return thread.messages || [];
};

export const getThreadContextAsModelMessage = async (
  args: ConversationsRepliesArguments & { botId?: string; client: WebClient },
): Promise<SlackUIMessage[]> => {
  const { botId, client, ...repliesArgs } = args;
  const messages = await getThreadContext(repliesArgs, client);

  return messages.map((message) => {
    const { bot_id, text, user, ts, thread_ts, type } = message;
    // If botId provided, match exactly; otherwise treat any bot message as assistant
    const isAssistant = botId ? bot_id === botId : !!bot_id;
    const metadata = {
      user: user || null,
      bot_id: bot_id || null,
      ts,
      thread_ts,
      type,
    };
    if (isAssistant) {
      return { role: "assistant" as const, content: text ?? "", metadata };
    }
    return { role: "user" as const, content: text ?? "", metadata };
  });
};

const getChannelContext = async (
  args: ConversationsHistoryArguments,
  client: WebClient,
) => {
  const history = await client.conversations.history(args);
  return history.messages || [];
};

export const getChannelContextAsModelMessage = async (
  args: ConversationsHistoryArguments & { botId?: string; client: WebClient },
): Promise<SlackUIMessage[]> => {
  const { botId, client, ...historyArgs } = args;
  const messages = await getChannelContext(historyArgs, client);

  return messages.map((message) => {
    const { bot_id, text, user, ts, thread_ts, type } = message;
    // If botId provided, match exactly; otherwise treat any bot message as assistant
    const isAssistant = botId ? bot_id === botId : !!bot_id;
    const metadata = {
      user: user || null,
      bot_id: bot_id || null,
      ts,
      thread_ts,
      type,
    };
    if (isAssistant) {
      return { role: "assistant" as const, content: text ?? "", metadata };
    }
    return { role: "user" as const, content: text ?? "", metadata };
  });
};

export const addEmoji = async ({
  client,
  channel,
  timestamp,
  name,
}: {
  client: WebClient;
  channel: string;
  timestamp: string;
  name: string;
}) => {
  try {
    await client.reactions.add({
      channel,
      timestamp,
      name,
    });
  } catch (error) {
    console.warn(`Failed to add reaction ${name}:`, error);
  }
};

export const removeEmoji = async ({
  client,
  channel,
  timestamp,
  name,
}: {
  client: WebClient;
  channel: string;
  timestamp: string;
  name: string;
}) => {
  try {
    await client.reactions.remove({
      channel,
      timestamp,
      name,
    });
  } catch (error) {
    console.warn(`Failed to remove reaction ${name}:`, error);
  }
};
