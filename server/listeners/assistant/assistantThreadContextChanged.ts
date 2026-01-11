/**
 * The `assistant_thread_context_changed` event is sent when a user switches
 * channels while the Assistant container is open. If `threadContextChanged` is
 * not provided, context will be saved using the AssistantContextStore's `save`
 * method (either the DefaultAssistantContextStore or custom, if provided).
 *
 * @see {@link https://docs.slack.dev/reference/events/assistant_thread_context_changed}
 */
export const assistantThreadContextChanged = async ({
  logger,
  saveThreadContext,
}) => {
  // const { channel_id, thread_ts, context: assistantContext } = event.assistant_thread;
  try {
    await saveThreadContext();
  } catch (e) {
    logger.error(e);
  }
};
