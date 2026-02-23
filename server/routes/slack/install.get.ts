import installer from "~/lib/slack/installer";

export default defineEventHandler(async (event) => {
  try {
    await installer.handleInstallPath(event.node.req, event.node.res);
  } catch (error) {
    console.error(error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
