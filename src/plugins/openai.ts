import { FastifyPluginAsync } from "fastify";
import OpenAI from "openai";
import fp from "fastify-plugin";

const openaiPlugin: FastifyPluginAsync = async (fastify) => {
  const openai = new OpenAI({
    apiKey: fastify.config.OPENAI_API_KEY,
  });

  fastify.decorate("openai", openai);
};

export default fp(openaiPlugin, {
  name: "openai",
  dependencies: ["env"], // Ensure env plugin loads first
});
