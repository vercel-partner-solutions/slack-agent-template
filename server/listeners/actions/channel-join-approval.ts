import type {
  AllMiddlewareArgs,
  BlockAction,
  ButtonAction,
  SlackActionMiddlewareArgs,
} from "@slack/bolt";
import { channelJoinApprovalHook } from "~/lib/ai/workflows/hooks";

interface ChannelJoinApprovalValue {
  toolCallId: string;
  channelId: string;
  channelName?: string;
  approved: boolean;
}

export const channelJoinApprovalCallback = async ({
  ack,
  action,
  body,
  client,
  logger,
}: AllMiddlewareArgs & SlackActionMiddlewareArgs<BlockAction>) => {
  try {
    await ack();

    const buttonAction = action as ButtonAction;
    const value: ChannelJoinApprovalValue = JSON.parse(buttonAction.value);
    const { toolCallId, channelId, channelName, approved } = value;

    logger.info(
      `Channel join ${approved ? "approved" : "rejected"} for ${
        channelName || channelId
      } (toolCallId: ${toolCallId})`
    );

    // Set status to show the agent is processing (before resuming hook)
    const threadTs = body.message?.thread_ts;
    if (body.channel?.id && threadTs) {
      await client.assistant.threads.setStatus({
        channel_id: body.channel.id,
        thread_ts: threadTs,
        status: approved ? "is joining channel..." : "is processing...",
      });
    }

    // Resume the workflow hook with the approval decision
    await channelJoinApprovalHook.resume(toolCallId, {
      approved,
      channelId,
      channelName,
    });

    // Update the original message to show the decision
    // Use Slack's channel link format to make it clickable
    const channelLink = `<#${channelId}>`;
    const statusEmoji = approved ? "✅" : "❌";
    const statusText = approved ? "Approved" : "Rejected";

    // Update the message to reflect the user's decision
    if (body.message?.ts && body.channel?.id) {
      await client.chat.update({
        channel: body.channel.id,
        ts: body.message.ts,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${statusEmoji} *${statusText}*: Request to join ${channelLink}`,
            },
          },
        ],
        text: `${statusText}: Join channel ${channelLink}`,
      });
    }
  } catch (error) {
    logger.error("Failed to process channel join approval:", error);
  }
};
