import fp from "fastify-plugin";
import { FastifySensibleOptions } from "@fastify/sensible";

const RESPONSE_SCHEMA = {
  $id: "response-schema",
  type: "object",
  properties: {
    status: { type: "string" },
    message: { type: "string" },
  },
};

export default fp<FastifySensibleOptions>(async (fastify) => {
  fastify.addSchema(RESPONSE_SCHEMA);
});
