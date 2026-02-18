import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";

export type MCPClientInstance = Awaited<ReturnType<typeof createMCPClient>>;

/**
 * Creates a Slack MCP client using the official @modelcontextprotocol/server-slack package.
 *
 * This uses stdio transport to communicate with the Slack MCP server subprocess.
 * The server provides tools like slack_list_channels, slack_post_message,
 * slack_reply_to_thread, slack_add_reaction, slack_get_channel_history,
 * slack_get_thread_replies, slack_get_users, and slack_get_user_profile.
 *
 * Required env vars:
 * - SLACK_BOT_TOKEN: The Bot User OAuth Token (xoxb-...)
 * - SLACK_TEAM_ID: The workspace team ID (T...)
 *
 * @returns The MCP client instance (must be closed after use)
 */
export async function createSlackMCPClient(): Promise<MCPClientInstance> {
  const token = process.env.SLACK_BOT_TOKEN;
  const teamId = process.env.SLACK_TEAM_ID;

  if (!token) {
    throw new Error(
      "SLACK_BOT_TOKEN is required to start the Slack MCP server"
    );
  }
  if (!teamId) {
    throw new Error("SLACK_TEAM_ID is required to start the Slack MCP server");
  }

  const transport = new Experimental_StdioMCPTransport({
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    env: {
      SLACK_BOT_TOKEN: token,
      SLACK_TEAM_ID: teamId,
      // Pass through PATH so npx can find node
      PATH: process.env.PATH ?? "",
    },
  });

  const client = await createMCPClient({
    transport,
    name: "slack-agent-mcp-client",
  });

  return client;
}

/**
 * Gets tools from a Slack MCP client instance.
 * Returns an object of AI SDK tool definitions that can be spread into an agent's tools.
 */
export async function getSlackMCPTools(client: MCPClientInstance) {
  return await client.tools();
}
