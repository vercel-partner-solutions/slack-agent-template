import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type { ModelMessage } from "ai";
import { createSlackAgent } from "~/lib/ai/agent";
import { feedbackBlock } from "~/lib/slack/blocks";
import {
  getThreadContextAsModelMessage,
  updateAgentStatus,
} from "~/lib/slack/utils";

const appMentionCallback = async ({
  event,
  say,
  client,
  logger,
  context,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"app_mention">) => {
  logger.debug(`app_mention event received: ${JSON.stringify(event)}`);
  const thread_ts = event.thread_ts || event.ts;
  const channel = event.channel;

  try {
    let messages: ModelMessage[] = [];

    updateAgentStatus({
      channel_id: channel,
      thread_ts,
      status: "is typing...",
      loading_messages: ["is thinking..."],
    });
    messages = await getThreadContextAsModelMessage({
      channel,
      ts: thread_ts,
      botId: context.botId,
    });

    const agent = createSlackAgent({
      channel_id: channel,
      dm_channel: channel,
      thread_ts: thread_ts,
      is_dm: false,
      team_id: context.teamId,
      bot_id: context.botId,
    });

    const stream = await agent.stream({
      messages,
    });

    const streamer = client.chatStream({
      channel: channel,
      thread_ts: thread_ts || event.ts,
      recipient_team_id: context.teamId,
      recipient_user_id: context.userId,
    });

    for await (const chunk of stream.textStream) {
      await streamer.append({
        markdown_text: chunk,
      });
    }

    await streamer.stop({
      blocks: [feedbackBlock({ thread_ts })],
    });
  } catch (error) {
    logger.error("app_mention handler failed:", error);
    try {
      await say({
        text: "Sorry, something went wrong processing your message. Please try again.",
        thread_ts: event.thread_ts || event.ts,
      });
    } catch (error) {
      logger.error("Failed to send error response:", error);
    }
  }
};

export default appMentionCallback;
