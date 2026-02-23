import installer from "~/lib/slack/installer";

export default defineEventHandler(async (event) => {
  try {
    await installer.handleCallback(event.node.req, event.node.res);
  } catch (error) {
    console.error(error);
    return sendError(
      event,
      createError({
        statusCode: 500,
        statusMessage: "Internal Server Error",
      }),
    );
  }
});
