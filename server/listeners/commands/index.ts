import type { App } from "@slack/bolt";
import { jarvisCommandCallback } from "./jarvis";
import { sampleCommandCallback } from "./sample-command";
import { voiceCommandCallback } from "./voice";

const register = (app: App) => {
  app.command("/sample-command", sampleCommandCallback);
  app.command("/voice", voiceCommandCallback);
  app.command("/jarvis", jarvisCommandCallback);
};

export default { register };
