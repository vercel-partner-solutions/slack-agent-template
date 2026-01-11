import type { ModelMessage, UIMessageChunk } from "ai";
import { getWritable } from "workflow";
import { createSlackAgent } from "../agent";
import type { SlackAgentContext } from "../tools";

export async function chatWorkflow(
  messages: ModelMessage[],
  context: SlackAgentContext
) {
  "use workflow";
  const writable = getWritable<UIMessageChunk>();
  const agent = createSlackAgent(context);

  await agent.stream({
    messages,
    writable,
    experimental_context: context,
  });
}
