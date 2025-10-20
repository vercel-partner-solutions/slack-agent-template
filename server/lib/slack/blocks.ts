import type { ContextActionsBlock } from "@slack/web-api";

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
