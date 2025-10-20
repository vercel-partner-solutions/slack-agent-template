import type { App } from "@slack/bolt";
import { feedbackButtonsCallback } from "./feedback-button-action";
import sampleActionCallback from "./sample-action";

const register = (app: App) => {
  app.action("sample_action_id", sampleActionCallback);
  app.action("feedback", feedbackButtonsCallback);
};

export default { register };
