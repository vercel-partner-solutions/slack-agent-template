import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from "@slack/bolt";

import { createRealtimeSession } from "~/lib/ai/realtime";

export const voiceCommandCallback = async ({
  ack,
  respond,
  logger,
}: AllMiddlewareArgs & SlackCommandMiddlewareArgs) => {
  await ack();
  try {
    const session = await createRealtimeSession();
    await respond({
      response_type: "ephemeral",
      text: `Realtime voice session created. Token: \`${session.client_secret.value}\`\nExpires: ${session.client_secret.expires_at}`,
    });
  } catch (error) {
    logger.error("Voice command failed:", error);
    await respond({
      response_type: "ephemeral",
      text: "Failed to create Realtime session.",
    });
  }
};
