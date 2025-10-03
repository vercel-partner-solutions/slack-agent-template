import type { MessageBinaryFormat } from "@v0-sdk/react";
import type { Logger } from "@slack/bolt";
import { SlackStreamingClient } from "../slack/streaming";
import { StreamStateManager } from "./stream-manager";
import { renderToMarkdown } from "./render-to-markdown";

interface StreamingHandlerOptions {
  client: {
    apiCall: (
      method: string,
      options?: Record<string, unknown>,
    ) => Promise<unknown>;
  };
  logger: Logger;
  channel: string;
  thread_ts?: string;
  v0Stream: ReadableStream<Uint8Array>;
  onComplete?: (chatId?: string) => Promise<void>;
}

interface ChatMetadata {
  id?: string;
  name?: string;
  webUrl?: string;
  demoUrl?: string;
}

export async function handleV0StreamToSlack({
  client,
  logger,
  channel,
  thread_ts,
  v0Stream,
  onComplete,
}: StreamingHandlerOptions): Promise<void> {
  logger.debug("🚀 Starting v0 stream to Slack handler");
  logger.debug(`Channel: ${channel}, Thread: ${thread_ts || "none"}`);

  const slackStreaming = new SlackStreamingClient(client);
  const streamStateManager = new StreamStateManager();

  let streamTs: string | undefined;
  let lastContent = "";
  const chatMetadata: ChatMetadata = {};
  let batchedContent = "";
  let batchTimeout: NodeJS.Timeout | undefined;
  const BATCH_DELAY_MS = 100;
  let totalChunks = 0;
  let totalBatches = 0;

  const flushBatch = async () => {
    if (batchedContent && streamTs) {
      totalBatches++;
      logger.debug(
        `📤 Flushing batch #${totalBatches} (${batchedContent.length} chars)`,
      );
      try {
        await slackStreaming.appendStream({
          channel,
          ts: streamTs,
          markdown_text: batchedContent,
        });
        logger.debug(`✅ Batch #${totalBatches} sent successfully`);
        batchedContent = "";
      } catch (error) {
        logger.error(
          `❌ Failed to append stream (batch #${totalBatches}):`,
          error,
        );
      }
    }
  };

  const scheduleBatch = (content: string) => {
    logger.debug(`📦 Scheduling batch with ${content.length} new chars`);
    batchedContent += content;

    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }

    batchTimeout = setTimeout(() => {
      flushBatch();
    }, BATCH_DELAY_MS);
  };

  streamStateManager.subscribe(() => {
    const state = streamStateManager.getState();
    logger.debug(
      `📨 Stream state update - streaming: ${state.isStreaming}, complete: ${state.isComplete}`,
    );

    const currentContent = renderToMarkdown(state.content);
    logger.debug(`Current content length: ${currentContent.length} chars`);

    const newContent = currentContent.slice(lastContent.length);

    if (newContent) {
      logger.debug(`🆕 New content detected: ${newContent.length} chars`);
      scheduleBatch(newContent);
      lastContent = currentContent;
    }
  });

  try {
    logger.debug("🎬 Calling Slack startStream...");
    const startResponse = await slackStreaming.startStream({
      channel,
      thread_ts,
      markdown_text: "",
    });

    streamTs = startResponse.ts;
    logger.debug(`✅ Stream started with ts: ${streamTs}`);
    logger.debug(`Stream response:`, startResponse);

    logger.debug("🔄 Starting to process v0 stream...");
    await streamStateManager.processStream(v0Stream, {
      onChunk: (content: MessageBinaryFormat) => {
        totalChunks++;
        logger.debug(
          `📥 Chunk #${totalChunks} received, raw length: ${JSON.stringify(content).length}`,
        );
      },
      onChatData: (data: ChatMetadata) => {
        logger.debug("📊 Chat metadata received:", data);
        if (data.id) chatMetadata.id = data.id;
        if (data.name) chatMetadata.name = data.name;
        if (data.webUrl) chatMetadata.webUrl = data.webUrl;
        if (data.demoUrl) chatMetadata.demoUrl = data.demoUrl;
      },
      onComplete: async () => {
        logger.debug("🏁 Stream complete!");
        logger.debug(
          `Total chunks: ${totalChunks}, Total batches: ${totalBatches}`,
        );

        if (batchTimeout) {
          clearTimeout(batchTimeout);
        }
        await flushBatch();

        if (!streamTs) {
          logger.error("❌ No stream timestamp available");
          return;
        }

        const blocks = createCompletionBlocks(chatMetadata);
        logger.debug(`🎯 Stopping stream with ${blocks.length} blocks`);

        await slackStreaming.stopStream({
          channel,
          ts: streamTs,
          blocks,
        });

        logger.debug("✅ Stream stopped successfully");

        if (onComplete) {
          logger.debug("🔄 Calling onComplete callback");
          await onComplete(chatMetadata.id);
        }
      },
      onError: (error: string) => {
        logger.error("❌ Stream error:", error);
      },
    });
    logger.debug("✅ Stream processing complete");
  } catch (error) {
    logger.error("❌ Streaming handler failed:", error);

    if (streamTs) {
      try {
        logger.debug("🛑 Attempting to stop stream due to error");
        await slackStreaming.stopStream({
          channel,
          ts: streamTs,
          markdown_text: "\n\n_Error: Failed to complete streaming response_",
        });
      } catch (stopError) {
        logger.error("❌ Failed to stop stream:", stopError);
      }
    }

    throw error;
  } finally {
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }
    logger.debug("🏁 Stream handler finished");
  }
}

function createCompletionBlocks(metadata: ChatMetadata): unknown[] {
  const blocks: unknown[] = [];

  if (metadata.webUrl || metadata.demoUrl) {
    const actions: unknown[] = [];

    if (metadata.webUrl) {
      actions.push({
        type: "button",
        text: {
          type: "plain_text",
          text: "Open in v0",
          emoji: true,
        },
        url: metadata.webUrl,
        action_id: "open_in_v0_action",
      });
    }

    if (metadata.demoUrl) {
      actions.push({
        type: "button",
        text: {
          type: "plain_text",
          text: "View demo",
          emoji: true,
        },
        url: metadata.demoUrl,
        action_id: "view_demo_action",
      });
    }

    blocks.push({
      type: "actions",
      elements: actions,
    });
  }

  return blocks;
}
