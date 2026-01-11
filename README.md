# Slack Agent Template

[![Deploy with Vercel](https://vercel.com/button)](<https://vercel.com/new/clone?demo-description=This%20is%20a%20Slack%20Agent%20template%20built%20with%20Bolt%20for%20JavaScript%20(TypeScript)%20and%20the%20Nitro%20server%20framework.&demo-image=%2F%2Fimages.ctfassets.net%2Fe5382hct74si%2FSs9t7RkKlPtProrbDhZFM%2F0d11b9095ecf84c87a68fbdef6f12ad1%2FFrame__1_.png&demo-title=Slack%20Agent%20Template&demo-url=https%3A%2F%2Fgithub.com%2Fvercel-partner-solutions%2Fslack-agent-template&env=SLACK_SIGNING_SECRET%2CSLACK_BOT_TOKEN&envDescription=These%20environment%20variables%20are%20required%20to%20deploy%20your%20Slack%20app%20to%20Vercel&envLink=https%3A%2F%2Fapi.slack.com%2Fapps&from=templates&project-name=Slack%20Agent%20Template&project-names=Comma%20separated%20list%20of%20project%20names%2Cto%20match%20the%20root-directories&repository-name=slack-agent-template&repository-url=https%3A%2F%2Fgithub.com%2Fvercel-partner-solutions%2Fslack-agent-template&root-directories=List%20of%20directory%20paths%20for%20the%20directories%20to%20clone%20into%20projects&skippable-integrations=1>)

A Slack Agent template built with [Workflow DevKit](https://useworkflow.dev)'s `DurableAgent`, [AI SDK](https://ai-sdk.dev) tools, [Bolt for JavaScript](https://tools.slack.dev/bolt-js/) (TypeScript), and the [Nitro](https://nitro.build) server framework.

## Features

- **[Workflow DevKit](https://useworkflow.dev)** — Make any TypeScript function durable. Build AI agents that can suspend, resume, and maintain state with ease. Reliability-as-code with automatic retries and observability built in
- **[AI SDK](https://ai-sdk.dev)** — The AI Toolkit for TypeScript. Define type-safe tools with schema validation and switch between AI providers by changing a single line of code
- **[Vercel AI Gateway](https://vercel.com/ai-gateway)** — One endpoint, all your models. Access hundreds of AI models through a centralized interface with intelligent failovers and no rate limits
- **[Slack Assistant](https://api.slack.com/docs/apps/ai)** — Integrates with Slack's Assistant API for threaded conversations with real-time streaming responses
- **Human-in-the-Loop** — Built-in approval workflows that pause agent execution until a user approves sensitive actions like joining channels
- **Built-in Tools** — Pre-configured tools for reading channels, threads, joining channels (with approval), and searching

## Prerequisites

Before getting started, make sure you have a development workspace where you have permissions to install apps. You can use a [developer sandbox](https://api.slack.com/developer-program) or [create a workspace](https://slack.com/create).

## Getting Started

### Clone and install dependencies

```bash
git clone https://github.com/vercel-partner-solutions/slack-agent-template && cd slack-agent-template && pnpm install
```

### Create a Slack App

1. Open https://api.slack.com/apps/new and choose "From an app manifest"
2. Choose the workspace you want to use
3. Copy the contents of [`manifest.json`](./manifest.json) into the text box that says "Paste your manifest code here" (JSON tab) and click Next
4. Review the configuration and click Create
5. On the Install App tab, click Install to <Workspace_Name>
   - You will be redirected to the App Configuration dashboard
6. Copy the Bot User OAuth Token into your environment as `SLACK_BOT_TOKEN`
7. On the Basic Information tab, copy your Signing Secret into your environment as `SLACK_SIGNING_SECRET`

### Environment Setup

1. Add your `AI_GATEWAY_API_KEY` to your `.env` file. You can get one [here](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys%3Futm_source%3Dai_gateway_landing_page&title=Get+an+API+Key)
2. Add your `NGROK_AUTH_TOKEN` to your `.env` file. You can get one [here](https://dashboard.ngrok.com/login?state=X1FFBj9sgtS9-oFK_2-h15Xcg0zHPjp_b9edWYrpGBVvIluUPEAarKRIjpp8ZeCHNTljTyreeslpG6n8anuSCFUkgIxwLypEGOa4Ci_cmnXYLhOfYogHWB6TzWBYUmhFLPW0XeGn789mFV_muomVd7QizkgwuYW8Vz2wW315YIK5UPywQaIGFKV8)
3. In the terminal run `slack app link`
4. If prompted `update the manifest source to remote` select `yes`
5. Copy your App ID from the app you just created
6. Select `Local` when prompted
7. Open [`.slack/config.json`](./.slack/config.json) and update your manifest source to `local`

```json
{
  "manifest": {
    "source": "local"
  },
  "project_id": "<project-id-added-by-slack-cli>"
}
```

8. Start your local server using `slack run`. If prompted, select the workspace you'd like to grant access to
   - Select `yes` if asked "Update app settings with changes to the local manifest?"
9. Open your Slack workspace and add your new Slack Agent to a channel. Your Slack Agent should respond whenever it's tagged in a message or sent a DM

## Deploy to Vercel

1. Create a new Slack app for production following the steps from above
2. Create a new Vercel project [here](https://vercel.com/new) and select this repo
3. Copy the Bot User OAuth Token into your Vercel environment variables as `SLACK_BOT_TOKEN`
4. On the Basic Information tab, copy your Signing Secret into your Vercel environment variables as `SLACK_SIGNING_SECRET`
5. When your deployment has finished, open your App Manifest from the Slack App Dashboard
6. Update the manifest so all the `request_url` and `url` fields use `https://<your-app-domain>/api/slack/events`
7. Click save and you will be prompted to verify the URL
8. Open your Slack workspace and add your new Slack Agent to a channel. Your Slack Agent should respond whenever it's tagged in a message or sent a DM
   - _Note_: Make sure you add the production app, not the local app we setup earlier
9. Your app will now automatically build and deploy whenever you commit to your repo. More information [here](https://vercel.com/docs/git)

## Project Structure

### [`manifest.json`](./manifest.json)

[`manifest.json`](./manifest.json) is a configuration for Slack apps. With a manifest, you can create an app with a pre-defined configuration, or adjust the configuration of an existing app.

### [`/server/app.ts`](./server/app.ts)

[`/app.ts`](./server/app.ts) is the entry point of the application. This file is kept minimal and primarily serves to route inbound requests.

### [`/server/lib/ai`](./server/lib/ai)

Contains the AI agent implementation:

- **[`agent.ts`](./server/lib/ai/agent.ts)** — Creates the `DurableAgent` from Workflow with system instructions and available tools. The agent automatically handles tool calling loops until it has enough context to respond.

- **[`tools.ts`](./server/lib/ai/tools.ts)** — Tool definitions using AI SDK's `tool` function:
  - `getChannelMessages` — Fetches recent messages from a Slack channel
  - `getThreadMessages` — Fetches messages from a specific thread
  - `joinChannel` — Joins a public Slack channel (with Human-in-the-Loop approval)
  - `searchChannels` — Searches for channels by name, topic, or purpose

### [`/server/listeners`](./server/listeners)

Every incoming request is routed to a "listener". Inside this directory, we group each listener based on the Slack Platform feature used:

- [`/listeners/assistant`](./server/listeners/assistant) — Handles Slack Assistant events (thread started, user message, context changed)
- [`/listeners/actions`](./server/listeners/actions) — Handles interactive component actions (buttons, menus) including HITL approval handlers
- [`/listeners/shortcuts`](./server/listeners/shortcuts/index.ts) — Handles incoming [Shortcuts](https://api.slack.com/interactivity/shortcuts) requests
- [`/listeners/views`](./server/listeners/views/index.ts) — Handles [View submissions](https://api.slack.com/reference/interaction-payloads/views#view_submission)
- [`/listeners/events`](./server/listeners/events) — Handles Slack events like app mentions and home tab opens

### [`/server/api`](./server/api)

This is your Nitro server API directory. Contains [`events.post.ts`](./server/api/slack/events.post.ts) which matches the request URL defined in your [`manifest.json`](./manifest.json). Nitro uses file-based routing for incoming requests. Learn more [here](https://nitro.build/guide/routing).

## Agent Architecture

### Human-in-the-Loop (HITL) Workflow

This template demonstrates a production-ready Human-in-the-Loop pattern using Workflow DevKit's `defineHook` primitive. When the agent needs to perform sensitive actions (like joining a channel), it pauses execution and waits for user approval.

```
┌─────────────────────────────────────────────────────────────────┐
│                         HITL Flow                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Request ──▶ Agent ──▶ joinChannel Tool                    │
│                                    │                            │
│                                    ▼                            │
│                        ┌─────────────────────┐                  │
│                        │  Send Slack message │                  │
│                        │  with Approve/Reject│                  │
│                        │  buttons            │                  │
│                        └─────────────────────┘                  │
│                                    │                            │
│                                    ▼                            │
│                        ┌─────────────────────┐                  │
│                        │  Workflow PAUSES    │                  │
│                        │  (no compute used)  │◀── await hook    │
│                        └─────────────────────┘                  │
│                                    │                            │
│                         User clicks button                      │
│                                    │                            │
│                                    ▼                            │
│                        ┌─────────────────────┐                  │
│                        │  Action handler     │                  │
│                        │  calls hook.resume()│                  │
│                        └─────────────────────┘                  │
│                                    │                            │
│                                    ▼                            │
│                        ┌─────────────────────┐                  │
│                        │  Workflow RESUMES   │                  │
│                        │  with approval data │                  │
│                        └─────────────────────┘                  │
│                                    │                            │
│                                    ▼                            │
│                           Agent responds                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key files:**

- [`/server/lib/ai/workflows/hooks.ts`](./server/lib/ai/workflows/hooks.ts) — Hook definitions for HITL workflows (e.g., `channelJoinApprovalHook`)
- [`/server/lib/ai/tools.ts`](./server/lib/ai/tools.ts) — Tool definitions including `joinChannel` which uses the approval hook
- [`/server/lib/slack/blocks.ts`](./server/lib/slack/blocks.ts) — Slack Block Kit UI for approval buttons
- [`/server/listeners/actions/channel-join-approval.ts`](./server/listeners/actions/channel-join-approval.ts) — Action handler that resumes the workflow

**How it works:**

1. The `joinChannel` tool is called by the agent
2. A Slack message with Approve/Reject buttons is posted to the thread
3. `channelJoinApprovalHook.create()` creates a hook instance and the workflow pauses at `await hook`
4. When the user clicks a button, the action handler calls `hook.resume()` with the decision
5. The workflow resumes and the agent either joins the channel or acknowledges the rejection

This pattern can be extended for any action requiring human approval (e.g., sending messages, modifying data, external API calls).

## Customizing the Agent

### Modifying Instructions

Edit the `system` prompt in [`/server/lib/ai/agent.ts`](./server/lib/ai/agent.ts) to change how your agent behaves, responds, and uses tools.

### Adding New Tools

1. Add a new tool definition in `/server/lib/ai/tools.ts` using AI SDK's `tool` function:

```typescript
import { tool } from "ai";
import { z } from "zod";

const myNewTool = tool({
  description: "Description of what this tool does",
  inputSchema: z.object({
    param: z.string().describe("Parameter description"),
  }),
  execute: async ({ param }, { experimental_context }) => {
    "use step"; // Required for Workflow's durable execution
    const { client } = experimental_context as SlackAgentContext;
    // Tool implementation
    return { result: "..." };
  },
});
```

2. Add it to the `slackTools` export in `/server/lib/ai/tools.ts`
3. Update the agent instructions in `/server/lib/ai/agent.ts` to describe when to use the new tool

Learn more about building agents with the AI SDK in the [Agents documentation](https://ai-sdk.dev/docs/agents).

### Adding Human-in-the-Loop to Tools

To add approval workflows to your own tools:

1. Add a hook definition to `/server/lib/ai/workflows/hooks.ts`:

```typescript
import { defineHook } from "workflow";
import { z } from "zod";

export const myApprovalHook = defineHook({
  schema: z.object({
    approved: z.boolean(),
    // Add any additional data you need
  }),
});
```

2. In your tool's execute function (without `"use step"`), create and await the hook:

```typescript
execute: async ({ param }, { toolCallId, experimental_context }) => {
  // Send approval UI to user (in a step)
  await sendApprovalMessage(ctx, toolCallId);

  // Create hook and wait for approval (in workflow context)
  const hook = myApprovalHook.create({ token: toolCallId });
  const { approved } = await hook;

  if (!approved) {
    return { success: false, message: "User declined" };
  }

  // Perform the action (in a step)
  return await performAction(ctx);
};
```

3. Create an action handler that calls `hook.resume()` when the user responds

Learn more about hooks in the [Workflow DevKit documentation](https://useworkflow.dev/docs/foundations/hooks).

## Learn More

- [Workflow DevKit Documentation](https://useworkflow.dev/docs)
- [AI SDK Documentation](https://ai-sdk.dev)
- [Slack Bolt Documentation](https://tools.slack.dev/bolt-js/)
- [Slack Assistant API](https://api.slack.com/docs/apps/ai)
- [Nitro Documentation](https://nitro.build)
