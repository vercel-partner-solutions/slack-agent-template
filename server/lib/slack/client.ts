import { WebClient } from "@slack/web-api";

/** Extracts the token from a WebClient, throwing if missing */
export function getClientToken(client: WebClient): string {
  const { token } = client;
  if (!token) {
    throw new Error("WebClient is missing a token");
  }
  return token;
}

/** Creates a WebClient from a token */
export function createSlackClient(token: string): WebClient {
  return new WebClient(token);
}
