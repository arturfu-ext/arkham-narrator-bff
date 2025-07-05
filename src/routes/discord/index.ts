import { FastifyPluginAsync } from "fastify";

const discord: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get("/connect", async function () {
    await fastify.discord.connect();
    return { status: "ok", message: "Connected to Discord voice channel." };
  });

  fastify.get("/disconnect", async function () {
    await fastify.discord.disconnect();
    return { status: "ok", message: "Disconnected from Discord." };
  });

  fastify.get("/health", async function () {
    return { status: "ok", service: "discord" };
  });
};

export default discord;
