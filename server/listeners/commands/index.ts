import type { App } from "@slack/bolt";
import { sampleCommandCallback } from "./sample-command";
import { voiceCommandCallback } from "./voice";

const register = (app: App) => {
  app.command("/sample-command", sampleCommandCallback);
  app.command("/voice", voiceCommandCallback);
};

export default { register };
