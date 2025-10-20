import type { App } from "@slack/bolt";

import sampleActionCallback from "./sample-action";
import { feedbackButtonsCallback } from "./feedback-button-action";

const register = (app: App) => {
  app.action("sample_action_id", sampleActionCallback);
  app.action("feedback", feedbackButtonsCallback);
};

export default { register };
