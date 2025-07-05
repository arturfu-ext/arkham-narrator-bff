import "fastify";
import type { ElevenLabs } from "@elevenlabs/elevenlabs-js";
import type OpenAI from "openai";

// Extend Fastify types to include our environment configuration
declare module "fastify" {
  interface FastifyInstance {
    config: {
      OPENAI_API_KEY: string;
      ELEVENLABS_API_KEY: string;
      DISCORD_TOKEN: string;
      NODE_ENV: string;
      PORT: number;
      HOST: string;
    };
    openai: OpenAI;
    elevenlabs: ElevenLabs;
  }
}
