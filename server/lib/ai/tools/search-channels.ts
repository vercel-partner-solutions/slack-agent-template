import { tool } from "ai";
import { z } from "zod";
import { app } from "~/app";

export const searchChannelsTool = tool({
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
  execute: async ({ query, team_id }) => {
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
        const result = await app.client.conversations.list({
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
      app.logger.error("Failed to search channels:", error);
      return {
        success: false,
        message: "Failed to search channels",
        error: error instanceof Error ? error.message : "Unknown error",
        channels: [],
      };
    }
  },
});
