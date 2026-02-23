import { App, LogLevel } from "@slack/bolt";
import { VercelReceiver } from "@vercel/slack-bolt";
import { installationStore } from "./lib/slack/installation-store";
import installer from "./lib/slack/installer";
import registerListeners from "./listeners";

const logLevel =
  process.env.NODE_ENV === "development" ? LogLevel.DEBUG : LogLevel.INFO;

const receiver = new VercelReceiver({
  logLevel,
});

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver,
  deferInitialization: true,
  logLevel,
  installationStore,
  authorize: installer.authorize,
  ignoreSelf: true,
});

registerListeners(app);

export { app, receiver };
