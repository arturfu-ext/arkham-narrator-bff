import "fastify";
import type OpenAI from "openai";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

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
    elevenlabs: ElevenLabsClient;
    discord: {
      connect: () => Promise<void>;
      disconnect: () => Promise<void>;
      play: (readable: Readable) => Promise<void>;
      stop: () => boolean;
      pause: () => boolean;
      unpause: () => boolean;
    };
  }
}
