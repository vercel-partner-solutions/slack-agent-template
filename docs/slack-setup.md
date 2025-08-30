# Slack Setup Guide

This guide explains how to configure and run the Slack Agent template in your own workspace.

## 1. Create a Slack App
1. Open [https://api.slack.com/apps/new](https://api.slack.com/apps/new) and choose **From an app manifest**.
2. Select the workspace where you want to install the app.
3. Copy the contents of [`manifest.json`](../manifest.json) into the manifest editor and click **Next**.
4. Review the configuration and click **Create**.
5. On the **Basic Information** page, copy your **Slack Signing Secret** into your `.env` file as `SLACK_SIGNING_SECRET`.

## 2. Install the App and Gather Tokens
1. Navigate to **Install App** in the Slack app settings and click **Install to Workspace**.
2. Copy the **Bot User OAuth Token** and add it to your `.env` file as `SLACK_BOT_TOKEN`.
3. Add your `AI_GATEWAY_API_KEY` and `OPENAI_API_KEY` to the `.env` file to enable AI features. Optionally, include `VERCEL_OIDC_TOKEN` for Vercel AI Gateway authentication.

## 3. Link the App Locally
1. Run `slack app link` in the terminal and select your Slack team.
2. When prompted, choose your app and copy the App ID.
3. Select **Local** when asked for the environment.
4. Update [`.slack/config.json`](../.slack/config.json) so the manifest source is `local`:
   ```json
   {
     "manifest": { "source": "local" },
     "project_id": "<project-id-added-by-slack-cli>"
   }
   ```

## 4. Start the Development Server
1. Start the server with automatic tunneling using:
   ```bash
   pnpm dev:tunnel
   ```
   Alternatively, run `slack run` if you do not need automatic tunneling or manifest updates.
2. When prompted, select the workspace to grant access and confirm updating app settings with manifest changes.

## 5. Test in Slack
1. Open your Slack workspace and add the app to a channel or direct message.
2. Mention the app or send it a DM to confirm it responds.
3. Use the `/voice` slash command to start a voice session powered by the OpenAI Realtime API.

You now have a local Slack app running with the Slack Agent template.
