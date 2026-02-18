import type { AssistantThreadStartedMiddleware } from "@slack/bolt";
import { getUserToken } from "~/lib/slack/installation-store";

/**
 * The `assistant_thread_started` event is sent when a user opens the Assistant container.
 * This can happen via DM with the app or as a side-container within a channel.
 * @see {@link https://docs.slack.dev/reference/events/assistant_thread_started}
 */
export const assistantThreadStarted: AssistantThreadStartedMiddleware = async ({
  event,
  logger,
  say,
  setSuggestedPrompts,
  saveThreadContext,
  context: boltContext,
}) => {
  const { context } = event.assistant_thread;

  try {
    // Check if the user has authorized MCP tools via OAuth
    let hasMcpToken = false;
    if (boltContext.userId && boltContext.teamId) {
      try {
        const token = await getUserToken(
          boltContext.teamId,
          boltContext.userId
        );
        hasMcpToken = !!token;
      } catch {
        // DB not configured yet -- that's fine, just skip
      }
    }

    /**
     * Since context is not sent along with individual user messages, it's necessary to keep
     * track of the context of the conversation to better assist the user. Sending an initial
     * message to the user with context metadata facilitates this, and allows us to update it
     * whenever the user changes context (via the `assistant_thread_context_changed` event).
     * The `say` utility sends this metadata along automatically behind the scenes.
     * !! Please note: this is only intended for development and demonstrative purposes.
     */
    if (!hasMcpToken && process.env.SLACK_CLIENT_ID) {
      const baseUrl =
        process.env.SLACK_OAUTH_REDIRECT_URL?.replace(/\/$/, "") ||
        (process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000");
      const installUrl = `${baseUrl}/slack/install`;

      await say({
        text: `Hi, how can I help? For enhanced features like searching messages, files, and users, authorize the app: ${installUrl}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Hi, how can I help?\n\nFor enhanced features like searching messages, files, and users, <${installUrl}|authorize the app> to grant MCP access.`,
            },
          },
        ],
      });
    } else {
      await say("Hi, how can I help?");
    }

    await saveThreadContext();

    /**
     * Provide the user up to 4 optional, preset prompts to choose from.
     *
     * The first `title` prop is an optional label above the prompts that
     * defaults to 'Try these prompts:' if not provided.
     *
     * @see {@link https://docs.slack.dev/reference/methods/assistant.threads.setSuggestedPrompts}
     */
    if (!context.channel_id) {
      await setSuggestedPrompts({
        title: "What can I help you with?",
        prompts: [
          {
            title: "Generate ideas",
            message:
              "Pretend you are a marketing associate and you need new ideas for an enterprise productivity feature. Generate 10 ideas for a new feature launch.",
          },
        ],
      });
    }

    /**
     * If the user opens the Assistant container in a channel, additional
     * context is available. This can be used to provide conditional prompts
     * that only make sense to appear in that context.
     */
    if (context.channel_id) {
      await setSuggestedPrompts({
        title: "Perform an action based on the channel",
        prompts: [
          {
            title: "Summarize channel",
            message:
              "Assistant, please summarize the activity in this channel!",
          },
        ],
      });
    }
  } catch (e) {
    logger.error(e);
  }
};
