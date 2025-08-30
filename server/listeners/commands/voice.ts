import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";
import type {
  AllMiddlewareArgs,
  SlackCommandMiddlewareArgs,
} from "@slack/bolt";

export const voiceCommandCallback = async ({
  ack,
  respond,
  logger,
  client,
  command,
}: AllMiddlewareArgs & SlackCommandMiddlewareArgs) => {
  await ack();
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const agent = new RealtimeAgent({
      name: "Assistant",
      instructions: "You are a helpful assistant.",
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

    session.sendMessage(command.text);
    await finished;
    session.close();

    const audioBuffer = pcmToWav(chunks);
    await client.files.upload({
      channels: command.channel_id,
      filename: "voice-response.wav",
      file: audioBuffer,
      initial_comment: "Here's your voice response:",
    });

    await respond({
      response_type: "ephemeral",
      text: "Posted audio response.",
    });
  } catch (error) {
    logger.error("Voice command failed:", error);
    await respond({
      response_type: "ephemeral",
      text: "Failed to create voice response.",
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
