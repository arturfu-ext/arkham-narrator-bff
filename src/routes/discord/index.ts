import { FastifyPluginAsync } from "fastify";

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg"];

const discord: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  await fastify.register(import("@fastify/multipart"), {
    limits: {
      fileSize: FILE_SIZE_LIMIT,
    },
  });

  fastify.post(
    "/connect",
    {
      schema: {
        response: {
          200: { $ref: "response-schema#" },
        },
      },
    },
    async function () {
      await fastify.discord.connect();
      return { status: "OK", message: "Connected to Discord voice channel." };
    },
  );

  fastify.post(
    "/disconnect",
    {
      schema: {
        response: {
          200: { $ref: "response-schema#" },
        },
      },
    },
    async function () {
      await fastify.discord.disconnect();
      return { status: "OK", message: "Disconnected from Discord." };
    },
  );

  fastify.get("/health", async function () {
    return { status: "OK", service: "discord" };
  });

  fastify.post(
    "/play",
    {
      schema: {
        response: {
          200: { $ref: "response-schema#" },
          400: { $ref: "response-schema#" },
          500: { $ref: "response-schema#" },
        },
      },
    },
    async function (request, reply) {
      try {
        const audioFile = await request.file();
        if (!audioFile) {
          return reply.code(400).send({
            status: "BAD_REQUEST",
            message: "No audio file provided",
          });
        }

        if (!ALLOWED_FILE_TYPES.includes(audioFile.mimetype)) {
          return reply.code(400).send({
            status: "BAD_REQUEST",
            message: "Invalid file type. Only MP3, WAV, and OGG are supported.",
          });
        }
        fastify.discord.play(audioFile.file);
        return { status: "OK", message: `Now playing ${audioFile.filename}` };
      } catch (error) {
        fastify.log.error(error, "Failed to play audio");
        return reply.code(500).send({
          status: "INTERNAL_SERVER_ERROR",
          message: "Failed to play audio",
        });
      }
    },
  );

  fastify.post("/pause", async function () {
    fastify.discord.pause();
    return { status: "OK", message: "Audio paused" };
  });

  fastify.post("/unpause", async function () {
    fastify.discord.unpause();
    return { status: "OK", message: "Audio unpaused" };
  });

  fastify.post("/stop", async function () {
    fastify.discord.stop();
    return { status: "OK", message: "Audio stopped" };
  });

  fastify.get("/status", async function () {
    const status = await fastify.discord.getConnectionStatus();
    return {
      status,
    };
  });
};

export default discord;
