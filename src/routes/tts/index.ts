import { FastifyPluginAsync } from "fastify";

const VOICE_ID_BRUNO_SIAK = "JxVKcxm9wtnCYEs8V00p";

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

      // Use the ElevenLabs client from the plugin
      // Add your TTS logic here

      const audioStream = await fastify.elevenlabs.textToSpeech.stream(
        VOICE_ID_BRUNO_SIAK,
        {
          text,
          modelId: "eleven_multilingual_v2",
        },
      );

      await fastify.discord.play(audioStream);

      return { success: true, text };
    },
  );
};

export default elevenlabs;
