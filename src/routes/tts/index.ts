import { FastifyPluginAsync } from "fastify";
import type { VoiceSettings } from "@elevenlabs/elevenlabs-js/api/index.js";

const VOICE_LOOKUP: Record<
  string,
  { modelId: string; settings: VoiceSettings }
> = {
  "tomasz-zborek": {
    modelId: "g8ZOdhoD9R6eYKPTjKbE",
    settings: {
      speed: 1.1,
      stability: 0.4,
      similarityBoost: 0.6,
      style: 0.4,
      useSpeakerBoost: true,
    },
  },
  epic: {
    modelId: "FF7KdobWPaiR0vkcALHF",
    settings: {
      speed: 1.1,
      stability: 0.4,
      similarityBoost: 0.6,
      style: 0.4,
      useSpeakerBoost: true,
    },
  },
};

const elevenlabs: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post(
    "/",
    {
      schema: {
        body: {
          type: "object",
          required: ["text"],
          properties: {
            text: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { text } = request.body as { text: string };

      const voice = VOICE_LOOKUP["tomasz-zborek"];

      const audioStream = await fastify.elevenlabs.textToSpeech.stream(
        voice.modelId,
        {
          text,
          modelId: "eleven_multilingual_v2",
          voiceSettings: voice.settings,
        },
      );

      await fastify.discord.play(audioStream);

      return { success: true, text };
    },
  );
};

export default elevenlabs;
