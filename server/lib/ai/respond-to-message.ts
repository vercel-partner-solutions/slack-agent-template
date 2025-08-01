import { generateText, type ModelMessage } from "ai";

export const respondToMessage = async (messages: ModelMessage[]) => {
  try {
    const { text } = await generateText({
      model: "xai/grok-3",
      prompt: `
      		You are a Slack bot, powered by the xai/grok-3 model.
      		You are a helpful assistant.
      		`,
      messages,
    });

    return text;
  } catch (error) {
    console.error(error);
    return "Sorry, I encountered an error while processing your message.";
  }
};
