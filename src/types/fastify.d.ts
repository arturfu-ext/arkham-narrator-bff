import "fastify";

// Extend Fastify types to include our environment configuration
declare module "fastify" {
  interface FastifyInstance {
    config: {
      OPENAI_API_KEY: string;
      NODE_ENV: string;
      PORT: number;
      HOST: string;
    };
  }
}
