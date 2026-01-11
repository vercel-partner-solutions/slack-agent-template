import type { ModelMessage, UIMessageChunk } from "ai";
import { getWritable } from "workflow";
import { createSlackAgent } from "~/lib/ai/agent";
import type { SlackAgentContextInput } from "~/lib/ai/context";

export async function chatWorkflow(
  messages: ModelMessage[],
  context: SlackAgentContextInput
) {
  "use workflow";

  const writable = getWritable<UIMessageChunk>();
  const agent = createSlackAgent(context);

  await agent.stream({
    messages,
    writable,
    // Pass context to tools via experimental_context (client created inside steps)
    experimental_context: context,
  });
}
