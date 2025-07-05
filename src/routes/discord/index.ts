import { FastifyPluginAsync } from "fastify";

const discord: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get("/join", async function () {
    return { status: "ok" };
  });

  fastify.get("/health", async function () {
    return { status: "ok", service: "discord" };
  });
};

export default discord;
