import type { AllMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type { ModelMessage } from "ai";
import { generateMessage } from "~/lib/ai/respond-to-message";
import {
  getThreadContextAsModelMessage,
  MessageState,
  updateAgentStatus,
} from "~/lib/slack/utils";

const appMentionCallback = async ({
  event,
  say,
  logger,
  context,
}: AllMiddlewareArgs & SlackEventMiddlewareArgs<"app_mention">) => {
  const { channel, thread_ts, ts } = event;
  const { botId } = context;

  try {
    await MessageState.setProcessing({
      channel,
      timestamp: ts,
    });

    let messages: ModelMessage[] = [];
    if (thread_ts) {
      updateAgentStatus({
        channel,
        thread_ts,
        status: "is typing...",
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
          content: event.text,
        },
      ];
    }

    const { text } = await generateMessage({
      messages,
      channel,
      thread_ts,
      botId,
      event,
    });

    await say({
      blocks: [
        {
          type: "markdown",
          text,
        },
      ],
      // It's important to keep the text property as a fallback for improper markdown
      text,
      thread_ts: event.thread_ts || event.ts,
    });

    // Set completed state
    await MessageState.setCompleted({
      channel,
      timestamp: ts,
    });
  } catch (error) {
    logger.error("app_mention handler failed:", error);

    // Try to mark message as failed, but don't let this prevent user notification
    try {
      await MessageState.setError({
        channel,
        timestamp: ts,
      });
    } catch (reactionError) {
      logger.warn("Failed to set error reaction:", reactionError);
    }

    await say({
      text: "Sorry, something went wrong processing your message. Please try again.",
      thread_ts: event.thread_ts || event.ts,
    });
  }
};

export default appMentionCallback;
