import type { KnownEventFromType } from "@slack/bolt";
import { generateText, type ModelMessage, stepCountIs } from "ai";
import { app } from "~/app";
import {
  getActiveTools,
  getChannelMessagesTool,
  getThreadMessagesTool,
  updateAgentStatusTool,
  updateChatTitleTool,
} from "./tools";

interface RespondToMessageOptions {
  messages: ModelMessage[];
  event: KnownEventFromType<"message"> | KnownEventFromType<"app_mention">;
  channel?: string;
  thread_ts?: string;
  botId?: string;
}

export type ExperimentalContext = {
  channel?: string;
  thread_ts?: string;
  botId?: string;
};

export const respondToMessage = async ({
  messages,
  event,
  channel,
  thread_ts,
  botId,
}: RespondToMessageOptions) => {
  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      system: `
			You are Slack Agent, a friendly and professional agent for Slack.
      Always gather context from Slack before asking the user for clarification.

      ${
        "channel_type" in event && event.channel_type === "im"
          ? "You are in a direct message with the user."
          : "You are not in a direct message with the user."
      }

      Core Rules
      1. Decide if Context Is Needed
      - If the message is related to general knowledge, such as "Who is the president of the USA", do NOT fetch context -> respond.
      - If the message references earlier discussion, uses vague pronouns, or is incomplete → fetch context.
      - If unsure → fetch context.

      2. Always keep the user informed using updateAgentStatusTool in the format: is <doing thing>... (e.g., “is retrieving thread history...”).
      - Use multiple tool calls at once whenever possible.
      - Never mention technical details like API parameters or IDs.

      3. Fetching Context
      - If the message is a direct message, you don't have access to the channel, you only have access to the thread messages.
      - If context is needed, always read the thread first → getThreadMessagesTool.
      - If the thread messages are not related to the conversation -> getChannelMessagesTool.
      - Use the combination of thread and channel messages to answer the question.
      - Always read the thread and channel before asking the user for next steps or clarification.

      4. Titles
      - You can only update the title if you are in a direct message.
      - New conversation started → updateChatTitleTool with a relevant title.
      - Topic change → updateChatTitleTool with a new title.
      - Never update your status or inform the user when updating the title. This is an invisible action the user does not need to know about.

      5. Responding
      - After fetching context, answer clearly and helpfully.
      - Suggest next steps if needed; avoid unnecessary clarifying questions if tools can answer.
      - Slack markdown does not support language tags in code blocks.
      - If your response includes a user's id like U0931KUHGC8, you must tag them. You cannot respond with just the id. You must use the <@user_id> syntax.

      Message received
        │
        ├─ Needs context? (ambiguous, incomplete, references past)
        │      ├─ YES:
        │      │     1. updateAgentStatusTool ("is reading thread history...")
        │      │     2. getThreadMessagesTool 
        │      │     3. Thread context answers the question?
        │      │            ├─ YES:
        │      │            │   └─ Respond
        │      │            │     
        │      │            └─ NO:
        │      │                 1. updateAgentStatusTool ("is reading channel messages...")
        │      │                 2. getChannelMessagesTool
        │      │                 3. Channel context answers the question?
        │      │                        ├─ YES: Respond
        │      │                        └─ NO: Respond that you are unsure ans ask for more context.
        │      │
        │      └─ NO:
        │           Respond immediately (no context fetch needed)
        │
        ├─ Is direct message?
        │      └─ YES:
        │            1. Update the title of the chat to something concise and relevant to the conversation -> updateChatTitleTool
        │            2. Respond
        │
        └─ End
			`,
      messages,
      stopWhen: stepCountIs(5),
      tools: {
        updateChatTitleTool,
        getThreadMessagesTool,
        getChannelMessagesTool,
        updateAgentStatusTool,
      },
      prepareStep: () => {
        return {
          activeTools: getActiveTools(event),
        };
      },
      onStepFinish: ({ toolCalls }) => {
        if (toolCalls.length > 0) {
          app.logger.debug(
            "tool call args:",
            toolCalls.map((call) => call.input),
          );
        }
      },
      experimental_context: {
        channel,
        thread_ts,
        botId,
      } as ExperimentalContext,
    });
    return text;
  } catch (error) {
    app.logger.error(error);
    throw error;
  }
};
