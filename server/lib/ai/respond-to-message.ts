import { generateText, type ModelMessage } from "ai";

export const respondToMessage = async (messages: ModelMessage[]) => {
  try {
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      system: `
			You are SlackBot, a friendly and knowledgeable assistant for Slack users.
			Respond helpfully, concisely, and professionally to all questions and requests.
			Format your answers clearly, using bullet points or code blocks when appropriate.
			If you don't know the answer, say so honestly and suggest next steps if possible.
			Always be respectful, inclusive, and positive in your tone.
			If a message is unclear, politely ask for clarification.
			If the user is asking about a previous message, you can use the conversation history to respond to the user.
			You can also use the conversation history to understand the user's intent and respond accordingly.
			`,
      messages: messages,
    });
    return text;
  } catch (error) {
    console.error(error);
    return "Sorry, I encountered an error while processing your message.";
  }
};
