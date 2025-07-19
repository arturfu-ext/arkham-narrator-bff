import { readFileSync } from "fs";
import { join } from "path";
import { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";

const V2_TRANSLATE_INSTRUCTIONS = readFileSync(
  join(process.cwd(), "src/routes/ocr/v2-translate-instructions.txt"),
  "utf-8",
);

const translate: FastifyPluginAsyncJsonSchemaToTs = async (fastify): Promise<void> => {
  fastify.post(
    "/text",
    {
      schema: {
        body: {
          type: "object",
          required: ["text"],
          properties: {
            text: { type: "string" },
          },
        } as const,
      },
    },
    async function (request, reply) {
      const { text } = request.body;

      try {
        const translateResponse = await fastify.openai.responses.create({
          model: "gpt-4.1",
          instructions: V2_TRANSLATE_INSTRUCTIONS,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text,
                },
              ],
            },
          ],
        });

        fastify.log.info({ translatedText: translateResponse.output_text }, "Translate finished");

        return reply.send({
          status: "OK",
          result: translateResponse.output_text,
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

export default translate;
