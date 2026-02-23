import { InstallProvider } from "@slack/oauth";
import manifest from "../../../manifest.json";
import { installationStore } from "./installation-store";

const installer = new InstallProvider({
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET,
  directInstall: true,
  stateCookieName: "slack-app-oauth-state",
  installationStore,
  installUrlOptions: {
    scopes: manifest.oauth_config.scopes.bot,
    userScopes: ["identity.basic"],
    redirectUri: manifest.oauth_config.redirect_urls[0],
  },
});

export default installer;
