import type { VoiceSettings } from "@elevenlabs/elevenlabs-js/api/index.js";
import { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";

type VoiceDefinition = { name: string; id: string };

const SUPPORTED_VOICES: VoiceDefinition[] = [
  { name: "Tomasz Zborek", id: "g8ZOdhoD9R6eYKPTjKbE" },
  {
    name: "Epic Trailer Voice",
    id: "FF7KdobWPaiR0vkcALHF",
  },
  { name: "Alex - Narrator", id: "H5xTcsAIeS5RAykjz57a" },
  { name: "Adumundo PRO", id: "XoHJ8hwSLOtb2sXYdAzv" },
  { name: "Bruno Siak", id: "JxVKcxm9wtnCYEs8V00p" },
];

const DEFAULT_VOICE = SUPPORTED_VOICES[0];

const DEFAULT_SETTINGS: VoiceSettings = {
  speed: 1,
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0,
  useSpeakerBoost: true,
};

const tts: FastifyPluginAsyncJsonSchemaToTs = async (fastify): Promise<void> => {
  fastify.post(
    "/play",
    {
      schema: {
        body: {
          type: "object",
          required: ["text"],
          properties: {
            text: { type: "string" },
            voiceId: {
              type: "string",
              enum: SUPPORTED_VOICES.map((v) => v.id),
              default: DEFAULT_VOICE.id,
            },
            voiceSettings: {
              type: "object",
              properties: {
                speed: { type: "number", default: DEFAULT_SETTINGS.speed },
                stability: { type: "number", default: DEFAULT_SETTINGS.stability },
                similarityBoost: { type: "number", default: DEFAULT_SETTINGS.similarityBoost },
                style: { type: "number", default: DEFAULT_SETTINGS.style },
                useSpeakerBoost: { type: "boolean", default: DEFAULT_SETTINGS.useSpeakerBoost },
              },
            },
          },
        } as const,
      },
    },
    async (request) => {
      const { text, voiceId, voiceSettings } = request.body;

      const audioStream = await fastify.elevenlabs.textToSpeech.stream(voiceId, {
        text,
        modelId: "eleven_multilingual_v2",
        voiceSettings,
      });

      await fastify.discord.play(audioStream);

      return { success: true, text };
    },
  );

  fastify.get(
    "/voices",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          } as const,
        },
      },
    },
    async () => {
      return SUPPORTED_VOICES;
    },
  );
};

export default tts;
