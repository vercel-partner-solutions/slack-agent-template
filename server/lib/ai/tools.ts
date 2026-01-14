import { tool } from "ai";
import { z } from "zod";
import type { SlackAgentContextInput } from "~/lib/ai/context";
import { channelJoinApprovalHook } from "~/lib/ai/workflows/hooks";

const getChannelMessages = tool({
  description:
    "Get the messages from a Slack channel. Use this to understand the context of a channel conversation. Pass the channel_id of the channel you want to read.",
  inputSchema: z.object({
    channel_id: z
      .string()
      .describe(
        "The Slack channel ID to fetch messages from (e.g., C0A2NKEHLLV)"
      ),
  }),
  execute: async ({ channel_id }, { experimental_context }) => {
    "use step";
    // Dynamic imports inside step to avoid bundling Node.js modules in workflow
    const { WebClient } = await import("@slack/web-api");
    const { getChannelContextAsModelMessage } = await import(
      "~/lib/slack/utils"
    );

    const ctx = experimental_context as SlackAgentContextInput;
    const client = new WebClient(ctx.token);
    try {
      const messages = await getChannelContextAsModelMessage({
        channel: channel_id,
        botId: ctx.bot_id,
        client,
      });
      return {
        success: true,
        messages,
      };
    } catch (error) {
      console.error("Failed to get channel messages:", error);
      return {
        success: false,
        message: "Failed to get channel messages",
        error: error instanceof Error ? error.message : "Unknown error",
        messages: [],
      };
    }
  },
});

const getThreadMessages = tool({
  description:
    "Get the messages from the current conversation thread. This retrieves the conversation history between you and the user.",
  inputSchema: z.object({
    dm_channel: z
      .string()
      .describe("The DM channel ID where this thread lives"),
    thread_ts: z.string().describe("The thread timestamp"),
  }),
  execute: async ({ dm_channel, thread_ts }, { experimental_context }) => {
    "use step";
    const { WebClient } = await import("@slack/web-api");
    const { getThreadContextAsModelMessage } = await import(
      "~/lib/slack/utils"
    );

    const ctx = experimental_context as SlackAgentContextInput;
    const client = new WebClient(ctx.token);
    try {
      const messages = await getThreadContextAsModelMessage({
        channel: dm_channel,
        ts: thread_ts,
        botId: ctx.bot_id,
        client,
      });
      return {
        success: true,
        messages,
      };
    } catch (error) {
      console.error("Failed to get thread messages:", error);
      return {
        success: false,
        message: "Failed to get thread messages",
        error: error instanceof Error ? error.message : "Unknown error",
        messages: [],
      };
    }
  },
});

// Helper step function to check channel and send approval request
async function sendApprovalRequest(
  ctx: SlackAgentContextInput,
  channelId: string,
  toolCallId: string
): Promise<
  | { success: true; channelName?: string }
  | { success: false; message: string; isPrivate?: boolean }
> {
  "use step";
  const { WebClient } = await import("@slack/web-api");
  const { channelJoinApprovalBlocks } = await import("~/lib/slack/blocks");

  const client = new WebClient(ctx.token);

  // Get channel info to get friendly name
  let channelName: string | undefined;

  try {
    const channelInfo = await client.conversations.info({
      channel: channelId,
    });
    channelName = channelInfo.channel?.name;
  } catch (infoError) {
    // If we get "channel_not_found", it's likely a private channel we can't access
    // (bots can't see private channels they're not members of)
    const errorMessage = infoError instanceof Error ? infoError.message : "";
    if (
      errorMessage.includes("channel_not_found") ||
      errorMessage.includes("missing_scope")
    ) {
      return {
        success: false,
        message:
          "I cannot access this channel. It may be a private channel. I can only join public channels since I don't have a user token.",
        isPrivate: true,
      };
    }
    // For other errors, continue without name
  }

  // Send approval request as a reply in the current thread (not top-level)
  await client.chat.postMessage({
    channel: ctx.dm_channel,
    thread_ts: ctx.thread_ts,
    blocks: channelJoinApprovalBlocks({
      toolCallId,
      channelId: channelId,
      channelName,
    }),
    text: `Permission request: Join channel <#${channelId}>?`,
  });

  return { success: true, channelName };
}

// Helper step function to actually join the channel
async function performChannelJoin(
  ctx: SlackAgentContextInput,
  channelId: string
): Promise<{
  success: boolean;
  message: string;
  channel?: unknown;
  error?: string;
}> {
  "use step";
  const { WebClient } = await import("@slack/web-api");
  const client = new WebClient(ctx.token);

  try {
    const result = await client.conversations.join({
      channel: channelId,
    });

    if (result.ok) {
      return {
        success: true,
        message: `Successfully joined channel <#${channelId}>`,
        channel: result.channel,
      };
    }

    return {
      success: false,
      message: "Failed to join channel after approval",
      error: result.error,
    };
  } catch (error) {
    console.error("Failed to join channel:", error);
    return {
      success: false,
      message: "Failed to join channel",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

const joinChannel = tool({
  description:
    "Join a public Slack channel. Use this when you need to access a channel's messages but aren't a member yet. Only works for public channels. This will request approval from the user before joining.",
  inputSchema: z.object({
    channel_id: z
      .string()
      .describe("The Slack channel ID to join (e.g., C0A2NKEHLLV)"),
  }),
  execute: async ({ channel_id }, { toolCallId, experimental_context }) => {
    // Tool execute runs in workflow context - hooks must be created here, not in steps
    const ctx = experimental_context as SlackAgentContextInput;

    try {
      // Step 1: Check channel and send approval request (runs in step context)
      const approvalResult = await sendApprovalRequest(
        ctx,
        channel_id,
        toolCallId
      );

      if (!approvalResult.success) {
        return approvalResult;
      }

      // Step 2: Create hook and wait for approval (runs in workflow context)
      const hook = channelJoinApprovalHook.create({ token: toolCallId });
      const { approved, channelId } = await hook;

      if (!approved) {
        return {
          success: false,
          message: `User declined to join channel <#${channelId}>`,
          rejected: true,
        };
      }

      // Step 3: Actually join the channel (runs in step context)
      return await performChannelJoin(ctx, channelId);
    } catch (error) {
      console.error("Failed to join channel:", error);
      return {
        success: false,
        message: "Failed to join channel",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

const searchChannels = tool({
  description:
    "Search for Slack channels by name or topic. Use this when the user asks about a channel by name (e.g., 'tell me about the marketing channel') or wants to find channels matching certain criteria. Returns channel details including name, purpose, topic, and member count.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The search query to find channels (e.g., 'marketing', 'engineering', 'announcements')"
      ),
    team_id: z.string().describe("The workspace team ID to search channels in"),
  }),
  execute: async ({ query, team_id }, { experimental_context }) => {
    "use step";
    const { WebClient } = await import("@slack/web-api");

    const ctx = experimental_context as SlackAgentContextInput;
    const client = new WebClient(ctx.token);
    try {
      const normalizedQuery = query.toLowerCase().replace(/^#/, "");

      // Fetch all public channels (paginated)
      const allChannels: Array<{
        id: string;
        name: string;
        purpose?: { value?: string };
        topic?: { value?: string };
        num_members?: number;
        is_archived?: boolean;
        is_private?: boolean;
      }> = [];

      let cursor: string | undefined;
      do {
        const result = await client.conversations.list({
          team_id,
          types: "public_channel",
          exclude_archived: true,
          limit: 200,
          cursor,
        });

        if (result.channels) {
          allChannels.push(
            ...result.channels.filter(
              (ch): ch is (typeof allChannels)[number] => !!ch.id && !!ch.name
            )
          );
        }

        cursor = result.response_metadata?.next_cursor;
      } while (cursor);

      // Filter channels matching the query
      const matchingChannels = allChannels.filter((channel) => {
        const name = channel.name?.toLowerCase() || "";
        const purpose = channel.purpose?.value?.toLowerCase() || "";
        const topic = channel.topic?.value?.toLowerCase() || "";

        return (
          name.includes(normalizedQuery) ||
          purpose.includes(normalizedQuery) ||
          topic.includes(normalizedQuery)
        );
      });

      if (matchingChannels.length === 0) {
        return {
          success: true,
          message: `No channels found matching "${query}"`,
          channels: [],
        };
      }

      // Sort by relevance (exact name match first, then by member count)
      const sortedChannels = matchingChannels.sort((a, b) => {
        const aExactMatch = a.name?.toLowerCase() === normalizedQuery;
        const bExactMatch = b.name?.toLowerCase() === normalizedQuery;
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        return (b.num_members || 0) - (a.num_members || 0);
      });

      // Return top 10 most relevant channels
      const topChannels = sortedChannels.slice(0, 10).map((channel) => ({
        id: channel.id,
        name: channel.name,
        purpose: channel.purpose?.value || null,
        topic: channel.topic?.value || null,
        member_count: channel.num_members || 0,
      }));

      return {
        success: true,
        message: `Found ${matchingChannels.length} channel(s) matching "${query}"`,
        channels: topChannels,
      };
    } catch (error) {
      console.error("Failed to search channels:", error);
      return {
        success: false,
        message: "Failed to search channels",
        error: error instanceof Error ? error.message : "Unknown error",
        channels: [],
      };
    }
  },
});

export const slackTools = {
  getChannelMessages,
  getThreadMessages,
  joinChannel,
  searchChannels,
};
