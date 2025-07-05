import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";

// Define the environment schema
const envSchema = {
  type: "object",
  required: ["OPENAI_API_KEY"],
  properties: {
    OPENAI_API_KEY: {
      type: "string",
      description: "OpenAI API key for vision and chat completions",
    },
    NODE_ENV: {
      type: "string",
      default: "development",
    },
    PORT: {
      type: "number",
      default: 3000,
    },
    HOST: {
      type: "string",
      default: "0.0.0.0",
    },
  },
};

const envPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(import("@fastify/env"), {
    schema: envSchema,
    dotenv: true, // This will load .env files
  });
};

export default fp(envPlugin, {
  name: "env",
});
