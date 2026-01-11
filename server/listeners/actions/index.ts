import type { App } from "@slack/bolt";
import { channelJoinApprovalCallback } from "./channel-join-approval";
import { feedbackButtonsCallback } from "./feedback-button-action";
import sampleActionCallback from "./sample-action";
import { CHANNEL_JOIN_APPROVAL_ACTION } from "~/lib/slack/blocks";

const register = (app: App) => {
  app.action("sample_action_id", sampleActionCallback);
  app.action("feedback", feedbackButtonsCallback);
  // Channel join approval actions (approve and reject buttons)
  app.action(CHANNEL_JOIN_APPROVAL_ACTION, channelJoinApprovalCallback);
  app.action(`${CHANNEL_JOIN_APPROVAL_ACTION}_reject`, channelJoinApprovalCallback);
};

export default { register };
