import { Annotation, END, StateGraph } from "@langchain/langgraph";
import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from "@slack/bolt";

const JarvisState = Annotation.Root({
  query: Annotation<string>,
  result: Annotation<string>,
  audio: Annotation<Buffer>,
});

export const jarvisCommandCallback = async ({
  ack,
  respond,
  logger,
  client,
  command,
}: AllMiddlewareArgs & SlackCommandMiddlewareArgs) => {
  await ack();
  try {
    const graph = new StateGraph(JarvisState)
      .addNode("search", async (state: typeof JarvisState.State) => {
        const res = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(state.query)}&format=json`,
        );
        const data = await res.json();
        const related =
          data.AbstractText ||
          (Array.isArray(data.RelatedTopics) && data.RelatedTopics[0]?.Text) ||
          "No results found.";
        return { result: related };
      })
      .addNode("answer", async (state: typeof JarvisState.State) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error("OPENAI_API_KEY is not set");
        }
        const agent = new RealtimeAgent({
          name: "Jarvis",
          instructions:
            "Use the search result to answer the user's query concisely.",
        });
        const session = new RealtimeSession(agent, { transport: "websocket" });
        await session.connect({ apiKey });

        const chunks: Buffer[] = [];
        session.on("audio", (event) => {
          chunks.push(Buffer.from(event.data));
        });

        const finished = new Promise<void>((resolve, reject) => {
          session.once("audio_stopped", () => resolve());
          session.once("error", (err: { error: unknown }) => reject(err.error));
        });

        session.sendMessage(
          `User query: ${state.query}\nSearch result: ${state.result}`,
        );
        await finished;
        session.close();
        const audioBuffer = pcmToWav(chunks);
        return { audio: audioBuffer };
      })
      .addEdge("__start__", "search")
      .addEdge("search", "answer")
      .addEdge("answer", END)
      .compile();

    const finalState = await graph.invoke({ query: command.text });

    await client.files.uploadV2({
      channel_id: command.channel_id,
      filename: "jarvis-response.wav",
      file: finalState.audio,
      initial_comment: "Here's your Jarvis response:",
    });

    await respond({
      response_type: "ephemeral",
      text: "Posted Jarvis audio response.",
    });
  } catch (error) {
    logger.error("Jarvis command failed:", error);
    await respond({
      response_type: "ephemeral",
      text: "Failed to process Jarvis command.",
    });
  }
};

function pcmToWav(buffers: Buffer[], sampleRate = 24000) {
  const pcm = Buffer.concat(buffers);
  const header = Buffer.alloc(44);
  const bytesPerSample = 2;
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * bytesPerSample;
  const blockAlign = numChannels * bytesPerSample;

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bytesPerSample * 8, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}
