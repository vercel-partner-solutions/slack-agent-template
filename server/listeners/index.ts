import type { App } from "@slack/bolt";
import actions from "./actions";
import assistant from "./assistant";
import commands from "./commands";
import events from "./events";
import messages from "./messages";
import shortcuts from "./shortcuts";
import views from "./views";

const registerListeners = (app: App) => {
  actions.register(app);
  assistant.register(app);
  commands.register(app);
  events.register(app);
  messages.register(app);
  shortcuts.register(app);
  views.register(app);
};

export default registerListeners;
