import { Assistant } from "@slack/bolt";
import { assistantThreadContextChanged } from "./assistantThreadContextChanged";
import { assistantThreadStarted } from "./assistantThreadStarted";
import { assistantUserMessage } from "./assistantUserMessage";

export const assistant = new Assistant({
  /**
   * (Recommended) A custom ThreadContextStore can be provided, inclusive of methods to
   * get and save thread context. When provided, these methods will override the `getThreadContext`
   * and `saveThreadContext` utilities that are made available in other Assistant event listeners.
   */
  // threadContextStore: {
  //   get: async ({ context, client, payload }) => {},
  //   save: async ({ context, client, payload }) => {},
  // },

  /**
   * `assistant_thread_started` is sent when a user opens the Assistant container.
   * This can happen via DM with the app or as a side-container within a channel.
   */
  threadStarted: assistantThreadStarted,

  /**
   * `assistant_thread_context_changed` is sent when a user switches channels
   * while the Assistant container is open. If `threadContextChanged` is not
   * provided, context will be saved using the AssistantContextStore's `save`
   * method (either the DefaultAssistantContextStore or custom, if provided).
   */
  threadContextChanged: assistantThreadContextChanged,

  /**
   * Messages sent from the user to the Assistant are handled in this listener.
   */
  userMessage: assistantUserMessage,
});
