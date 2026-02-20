import { createHandler } from "@vercel/slack-bolt";
import { defineHandler } from "nitro/h3";
import { app, receiver } from "~/app";

const handler = createHandler(app, receiver);

export default defineHandler(async (event) => {
  return await handler(event.req);
});
