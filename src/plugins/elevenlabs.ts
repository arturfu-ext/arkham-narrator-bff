import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenlabsPlugin: FastifyPluginAsync = async (fastify) => {
  const elevenlabs = new ElevenLabsClient({
    apiKey: fastify.config.ELEVENLABS_API_KEY,
  });

  fastify.decorate("elevenlabs", elevenlabs);
};

export default fp(elevenlabsPlugin, {
  name: "elevenlabs",
  dependencies: ["env"], // Ensure env plugin loads first
});
