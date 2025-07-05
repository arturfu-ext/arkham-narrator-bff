import { FastifyPluginAsync } from "fastify";
import OpenAI from "openai";
import { readFileSync } from "fs";
import { join } from "path";

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

const MODEL_INSTRUCTIONS = readFileSync(
  join(process.cwd(), "src/routes/ocr/model-instructions.txt"),
  "utf-8",
);

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
  // Register multipart support
  await fastify.register(import("@fastify/multipart"), {
    limits: {
      fileSize: FILE_SIZE_LIMIT,
    },
  });

  console.log(process.cwd());

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
          fastify.openai,
          fileBuffer,
          data.filename,
          data.mimetype,
        );

        fastify.log.info({ fileId }, "File uploaded to OpenAI");

        const response = await fastify.openai.responses.create({
          model: "gpt-4.1",
          instructions: MODEL_INSTRUCTIONS,
          input: [
            {
              role: "user",
              content: [
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
        fastify.log.error(error, "OCR processing error");

        return reply.code(500).send({
          success: false,
          error: "Failed to process image for OCR",
        });
      }
    },
  );

  fastify.get("/health", async function () {
    return { status: "ok", service: "ocr" };
  });
};

export default ocr;
