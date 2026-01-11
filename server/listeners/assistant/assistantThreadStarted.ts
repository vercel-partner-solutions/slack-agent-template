import type { AssistantThreadStartedMiddleware } from "@slack/bolt";

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
  setStatus,
  client,
}) => {
  const { context } = event.assistant_thread;

  try {
    /**
     * Since context is not sent along with individual user messages, it's necessary to keep
     * track of the context of the conversation to better assist the user. Sending an initial
     * message to the user with context metadata facilitates this, and allows us to update it
     * whenever the user changes context (via the `assistant_thread_context_changed` event).
     * The `say` utility sends this metadata along automatically behind the scenes.
     * !! Please note: this is only intended for development and demonstrative purposes.
     */
    await say("Hi, how can I help?");

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
      await setStatus("is gathering context...");
      const channelInfo = await client.conversations.info({
        channel: context.channel_id,
      });
      await setSuggestedPrompts({
        title: "Perform an action based on the channel",
        prompts: [
          {
            title: `Summarize ${channelInfo.channel?.name}`,
            message: `Summarize the activity in ${channelInfo.channel?.name}`,
          },
        ],
      });
    }
  } catch (e) {
    logger.error(e);
  }
};
