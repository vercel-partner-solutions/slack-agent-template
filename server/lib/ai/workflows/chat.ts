import type { ModelMessage, ToolSet, UIMessageChunk } from "ai";
import { getWritable } from "workflow";
import { createSlackAgent } from "~/lib/ai/agent";
import type { SlackAgentContextInput } from "~/lib/ai/context";
import {
  createSlackMCPClient,
  getSlackMCPTools,
  type MCPClientInstance,
} from "~/lib/ai/mcp";

export async function chatWorkflow(
  messages: ModelMessage[],
  context: SlackAgentContextInput
) {
  "use workflow";

  const writable = getWritable<UIMessageChunk>();

  // Initialize MCP client for Slack's official MCP server (if user has authorized via OAuth)
  let mcpClient: MCPClientInstance | undefined;
  let mcpTools: ToolSet | undefined;

  if (context.userToken) {
    try {
      mcpClient = await createSlackMCPClient(context.userToken);
      mcpTools = await getSlackMCPTools(mcpClient);
    } catch (error) {
      console.warn("Failed to initialize Slack MCP client:", error);
      // Continue without MCP tools — the built-in tools still work
    }
  }

  try {
    const agent = createSlackAgent(context, mcpTools);

    await agent.stream({
      messages,
      writable,
      // Pass context to tools via experimental_context (client created inside steps)
      experimental_context: context,
    });
  } finally {
    // Always close the MCP client to clean up the HTTP session
    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}
