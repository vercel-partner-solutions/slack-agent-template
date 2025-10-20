import type {
  AllMiddlewareArgs,
  BlockFeedbackButtonsAction,
  SlackActionMiddlewareArgs,
} from "@slack/bolt";

export const feedbackButtonsCallback = async ({
  action,
  ack,
  logger,
  body,
  client,
}: AllMiddlewareArgs &
  SlackActionMiddlewareArgs<BlockFeedbackButtonsAction>) => {
  try {
    await ack();
    // Send to your API or database
    const { value } = action;
    const [thread_ts, feedback_type] = value.split(":");
    const user = body.user.id;
    logger.info(`Feedback button action received: ${feedback_type}`);
    await client.chat.postEphemeral({
      channel: body.channel.id,
      thread_ts,
      user,
      text: "Thank you for your feedback!",
    });
  } catch (error) {
    logger.error("Failed to send feedback:", error);
  }
};
