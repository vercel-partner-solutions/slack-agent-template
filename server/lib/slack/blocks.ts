import type {
  ActionsBlock,
  ContextActionsBlock,
  KnownBlock,
  SectionBlock,
} from "@slack/web-api";

export const feedbackBlock = ({
  thread_ts,
}: {
  thread_ts: string;
}): ContextActionsBlock => {
  return {
    type: "context_actions",
    elements: [
      {
        type: "feedback_buttons",
        action_id: "feedback",
        positive_button: {
          text: {
            type: "plain_text",
            text: "👍",
          },
          value: `${thread_ts}:positive_feedback`,
        },
        negative_button: {
          text: {
            type: "plain_text",
            text: "👎",
          },
          value: `${thread_ts}:negative_feedback`,
        },
      },
    ],
  };
};

export const CHANNEL_JOIN_APPROVAL_ACTION = "channel_join_approval";

export const channelJoinApprovalBlocks = ({
  toolCallId,
  channelId,
  channelName,
}: {
  toolCallId: string;
  channelId: string;
  channelName?: string;
}): KnownBlock[] => {
  // Use Slack's channel link format to make it clickable
  const channelLink = `<#${channelId}>`;

  const sectionBlock: SectionBlock = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `🔐 *Permission Request*\n\nI'd like to join the channel ${channelLink} to help with your request. Do you approve?`,
    },
  };

  const actionsBlock: ActionsBlock = {
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Approve",
          emoji: true,
        },
        style: "primary",
        action_id: CHANNEL_JOIN_APPROVAL_ACTION,
        value: JSON.stringify({
          toolCallId,
          channelId,
          channelName,
          approved: true,
        }),
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Reject",
          emoji: true,
        },
        style: "danger",
        action_id: `${CHANNEL_JOIN_APPROVAL_ACTION}_reject`,
        value: JSON.stringify({
          toolCallId,
          channelId,
          channelName,
          approved: false,
        }),
      },
    ],
  };

  return [sectionBlock, actionsBlock];
};
