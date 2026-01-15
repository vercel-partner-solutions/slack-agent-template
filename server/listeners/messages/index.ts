import type { App } from "@slack/bolt";

const register = (_app: App) => {
  // DMs are handled by the Assistant userMessage listener (Agents & AI Apps feature)
  // Public/private channel and group messages are handled by the app_mention event listener
};

export default { register };
