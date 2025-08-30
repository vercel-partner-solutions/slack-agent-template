interface RealtimeSession {
  id: string;
  model: string;
  expires_at: string;
  client_secret: {
    value: string;
    expires_at: string;
  };
}

/**
 * Create a new OpenAI Realtime session for voice conversations.
 *
 * This helper contacts the OpenAI Realtime API and returns an
 * ephemeral session token that can be used to establish a WebRTC
 * connection to the model. The token is short lived and should be
 * used immediately by the client.
 */
export const createRealtimeSession = async (): Promise<RealtimeSession> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "alloy",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create Realtime session: ${await response.text()}`,
    );
  }

  return (await response.json()) as RealtimeSession;
};
