import { FastifyPluginAsync } from "fastify";
import OpenAI from "openai";

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    text: { type: "string" },
    error: { type: "string" },
  },
};

async function createFileFromBuffer(
  openai: OpenAI,
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<string> {
  const file = new File([buffer], filename, { type: mimetype });

  const result = await openai.files.create({
    file,
    purpose: "vision",
  });

  return result.id;
}

const ocr: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // Initialize OpenAI client using Fastify's config
  const openai = new OpenAI({
    apiKey: fastify.config.OPENAI_API_KEY,
  });

  // Register multipart support
  await fastify.register(import("@fastify/multipart"), {
    limits: {
      fileSize: FILE_SIZE_LIMIT,
    },
  });

  fastify.post(
    "/",
    {
      schema: {
        response: {
          200: RESPONSE_SCHEMA,
          400: RESPONSE_SCHEMA,
          500: RESPONSE_SCHEMA,
        },
      },
    },
    async function (request, reply) {
      try {
        // Get the uploaded file
        const data = await request.file();

        if (!data) {
          return reply.code(400).send({
            success: false,
            error: "No file uploaded",
          });
        }

        if (!ALLOWED_FILE_TYPES.includes(data.mimetype)) {
          return reply.code(400).send({
            success: false,
            error:
              "Invalid file type. Only JPEG, PNG, GIF, and WebP are supported.",
          });
        }

        // Upload file to OpenAI Files API
        const fileBuffer = await data.toBuffer();
        const fileId = await createFileFromBuffer(
          openai,
          fileBuffer,
          data.filename,
          data.mimetype,
        );

        fastify.log.info("File uploaded to OpenAI:", fileId);

        const response = await openai.responses.create({
          model: "gpt-4.1-mini",
          input: [
            {
              role: "user",
              content: [
                { type: "input_text", text: "what's in this image?" },
                {
                  type: "input_image",
                  file_id: fileId,
                  detail: "auto",
                },
              ],
            },
          ],
        });

        return reply.send({
          success: true,
          text: response.output_text,
        });
      } catch (error) {
        console.log(error);
        fastify.log.error("OCR processing error:", error);

        return reply.code(500).send({
          success: false,
          error: "Failed to process image for OCR",
        });
      }
    },
  );

  // Health check endpoint
  fastify.get("/health", async function (request, reply) {
    return { status: "ok", service: "ocr" };
  });
};

export default ocr;
