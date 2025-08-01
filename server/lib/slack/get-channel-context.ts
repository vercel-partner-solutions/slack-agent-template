import type { ModelMessage } from "ai";
import slack from "./client";

export const getChannelContext = async (channel_id: string) => {
  const history = await slack.conversations.history({
    channel: channel_id,
    limit: 25,
  });

  return history.messages || [];
};

export const getChannelContextAsModelMessage = async (
  channel_id: string,
): Promise<ModelMessage[]> => {
  const messages = await getChannelContext(channel_id);

  return messages.map((message) => ({
    role: message.user === process.env.SLACK_BOT_ID ? "assistant" : "user",
    content: message.text,
  }));
};
