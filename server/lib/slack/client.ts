import { WebClient } from "@slack/web-api";

if (!process.env.SLACK_BOT_TOKEN) {
  throw new Error("SLACK_BOT_TOKEN environment variable is required");
}

export const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export default slack;
