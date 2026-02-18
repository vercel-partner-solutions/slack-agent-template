import { createMCPClient } from "@ai-sdk/mcp";

export type MCPClientInstance = Awaited<ReturnType<typeof createMCPClient>>;

/**
 * Creates a client for Slack's official MCP server at https://mcp.slack.com/mcp
 *
 * Uses the Streamable HTTP transport (JSON-RPC 2.0 over HTTP) — works in serverless
 * environments like Vercel since there's no subprocess or persistent connection needed.
 *
 * The server provides tools for searching channels/messages/users, sending messages,
 * managing canvases, reading threads and channel history, and more.
 *
 * @see https://docs.slack.dev/ai/slack-mcp-server/
 *
 * Required env vars:
 * - SLACK_MCP_USER_TOKEN: A Slack user OAuth token (xoxp-...) with the appropriate
 *   scopes for the MCP tools you want to use. See the Slack MCP docs for required scopes.
 *
 * @returns The MCP client instance (must be closed after use)
 */
export async function createSlackMCPClient(): Promise<MCPClientInstance> {
  const userToken = process.env.SLACK_MCP_USER_TOKEN;

  if (!userToken) {
    throw new Error(
      "SLACK_MCP_USER_TOKEN is required to connect to Slack's MCP server. " +
        "This must be a user OAuth token (xoxp-...) with the appropriate scopes. " +
        "See https://docs.slack.dev/ai/slack-mcp-server/ for details."
    );
  }

  const client = await createMCPClient({
    transport: {
      type: "http",
      url: "https://mcp.slack.com/mcp",
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    },
    name: "slack-mcp-client",
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
