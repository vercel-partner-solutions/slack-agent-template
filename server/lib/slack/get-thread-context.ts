import type { ModelMessage } from "ai";
import slack from "./client";

export const getThreadContext = async (
  thread_ts: string,
  channel_id: string,
) => {
  const thread = await slack.conversations.replies({
    channel: channel_id,
    ts: thread_ts,
    limit: 25,
  });

  return thread.messages || [];
};

export const getThreadContextAsModelMessage = async (
  thread_ts: string,
  channel_id: string,
  botId: string,
): Promise<ModelMessage[]> => {
  const messages = await getThreadContext(thread_ts, channel_id);

  return messages.map((message) => ({
    role: message.user === botId ? "assistant" : "user",
    content: message.text,
  }));
};
