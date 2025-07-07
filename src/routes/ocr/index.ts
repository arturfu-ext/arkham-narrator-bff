import { FastifyPluginAsync } from "fastify";
import { readFileSync } from "fs";
import { join } from "path";
import { FileObject } from "openai/resources/files.js";

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

const MAX_FILES = 5;

const V2_OCR_INSTRUCTIONS = readFileSync(
  join(process.cwd(), "src/routes/ocr/v2-ocr-instructions.txt"),
  "utf-8",
);

const V2_TRANSLATE_INSTRUCTIONS = readFileSync(
  join(process.cwd(), "src/routes/ocr/v2-translate-instructions.txt"),
  "utf-8",
);

async function validateFiles(files: File[]) {
  if (!files || files.length === 0) {
    throw new Error("No files uploaded", { cause: "VALIDATION_ERROR" });
  }

  if (files.length > MAX_FILES) {
    throw new Error(`Too many files. Maximum ${MAX_FILES} files allowed.`, {
      cause: "VALIDATION_ERROR",
    });
  }

  files.forEach((file) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(
        `Invalid file type: ${file.type}. Only JPEG, PNG, GIF, and WebP are supported.`,
        { cause: "VALIDATION_ERROR" },
      );
    }
  });
}

const ocr: FastifyPluginAsync = async (fastify): Promise<void> => {
  await fastify.register(import("@fastify/multipart"), {
    limits: {
      fileSize: FILE_SIZE_LIMIT,
    },
  });

  async function uploadFileToOpenAi(file: File): Promise<FileObject> {
    const result = await fastify.openai.files.create({
      file,
      purpose: "vision",
    });

    fastify.log.info({ fileId: result.id }, "File uploaded to OpenAI");

    return result;
  }

  fastify.post(
    "/",
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
        const files: File[] = [];

        // Read all files from the request
        for await (const requestFile of request.files()) {
          const fileBuffer = await requestFile.toBuffer();
          const file = new File([fileBuffer], requestFile.filename, {
            type: requestFile.mimetype,
          });
          files.push(file);
        }

        await validateFiles(files);

        // Start all uploads simultaneously
        const fileObjectPromises = files.map((file) => uploadFileToOpenAi(file));

        console.log("halko"); // This will now print

        const fileObjects = await Promise.all(fileObjectPromises);

        const ocrResponse = await fastify.openai.responses.create({
          model: "gpt-4.1-nano",
          instructions: V2_OCR_INSTRUCTIONS,
          input: [
            {
              role: "user",
              content: fileObjects.map((fileObject) => ({
                type: "input_image",
                file_id: fileObject.id,
                detail: "auto",
              })),
            },
          ],
        });

        if (!ocrResponse.output_text) {
          return reply.code(500).send({
            status: "INTERNAL_SERVER_ERROR",
            message: "Failed to process image for OCR",
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

        fastify.log.info({ translatedText: translateResponse.output_text }, "Translate finished");

        return reply.send({
          status: "OK",
          message: translateResponse.output_text,
        });
      } catch (error) {
        fastify.log.error(error, "OCR processing error");

        return reply.code(500).send({
          status: "INTERNAL_SERVER_ERROR",
          message: "Failed to process image for OCR",
        });
      }
    },
  );
};

export default ocr;
