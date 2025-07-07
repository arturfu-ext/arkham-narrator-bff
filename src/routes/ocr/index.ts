import { FastifyPluginAsync, FastifyReply } from "fastify";
import { readFileSync } from "fs";
import { join } from "path";
import { MultipartFile } from "@fastify/multipart";

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

const V2_OCR_INSTRUCTIONS = readFileSync(
  join(process.cwd(), "src/routes/ocr/v2-ocr-instructions.txt"),
  "utf-8",
);

const V2_TRANSLATE_INSTRUCTIONS = readFileSync(
  join(process.cwd(), "src/routes/ocr/v2-translate-instructions.txt"),
  "utf-8",
);

async function validateData(data: MultipartFile, reply: FastifyReply) {
  if (!data) {
    return reply.code(400).send({
      success: false,
      error: "No file uploaded",
    });
  }

  if (!ALLOWED_FILE_TYPES.includes(data.mimetype)) {
    return reply.code(400).send({
      success: false,
      error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are supported.",
    });
  }
}

const ocr: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // Register multipart support
  await fastify.register(import("@fastify/multipart"), {
    limits: {
      fileSize: FILE_SIZE_LIMIT,
    },
  });

  async function uploadFileToOpenAi(data: MultipartFile): Promise<string> {
    const fileBuffer = await data.toBuffer();

    const file = new File([fileBuffer], data.filename, { type: data.mimetype });

    const result = await fastify.openai.files.create({
      file,
      purpose: "vision",
    });

    fastify.log.info({ fileId: result.id }, "File uploaded to OpenAI");

    return result.id;
  }

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

        await validateData(data, reply);
        const fileId = await uploadFileToOpenAi(data);

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

  fastify.post(
    "/v2",
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

        await validateData(data, reply);
        const fileId = await uploadFileToOpenAi(data);

        const ocrResponse = await fastify.openai.responses.create({
          model: "gpt-4.1-nano",
          instructions: V2_OCR_INSTRUCTIONS,
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

        if (!ocrResponse.output_text) {
          return reply.code(500).send({
            success: false,
            error: "Failed to process image for OCR",
          });
        }

        fastify.log.info({ ocrText: ocrResponse.output_text }, "OCR finished");

        const translateResponse = await fastify.openai.responses.create({
          model: "gpt-4.1",
          instructions: V2_TRANSLATE_INSTRUCTIONS,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: ocrResponse.output_text,
                },
              ],
            },
          ],
        });

        fastify.log.info(
          { translatedText: translateResponse.output_text },
          "Translate finished",
        );

        return reply.send({
          success: true,
          text: translateResponse.output_text,
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
};

export default ocr;
