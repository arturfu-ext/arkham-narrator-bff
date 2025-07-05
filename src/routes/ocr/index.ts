import {FastifyPluginAsync} from 'fastify'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const ocr: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // Register multipart support
  await fastify.register(import('@fastify/multipart'), {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    }
  })

  // Schema for the response
  const ocrResponseSchema = {
    type: 'object',
    properties: {
      success: {type: 'boolean'},
      text: {type: 'string'},
      error: {type: 'string'}
    }
  }

  fastify.post('/', {
    schema: {
      response: {
        200: ocrResponseSchema,
        400: ocrResponseSchema,
        500: ocrResponseSchema
      }
    }
  }, async function (request, reply) {
    try {
      // Get the uploaded file
      const data = await request.file()

      if (!data) {
        return reply.code(400).send({
          success: false,
          error: 'No file uploaded'
        })
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are supported.'
        })
      }

      // Convert file buffer to base64
      const buffer = await data.toBuffer()
      const base64Image = buffer.toString('base64')
      const dataUrl = `data:${data.mimetype};base64,${base64Image}`

      // Call OpenAI Vision API
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using gpt-4o-mini as it's cost-effective for OCR tasks
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please extract all text from this image. Return only the extracted text, without any additional commentary or formatting."
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                  detail: "high"
                }
              }
            ]
          }
        ],
      })

      const extractedText = response.choices[0]?.message?.content || ''

      return reply.send({
        success: true,
        text: extractedText
      })

    } catch (error) {
      fastify.log.error('OCR processing error:', error)

      return reply.code(500).send({
        success: false,
        error: 'Failed to process image for OCR'
      })
    }
  })

  // Health check endpoint
  fastify.get('/health', async function (request, reply) {
    return {status: 'ok', service: 'ocr'}
  })
}

export default ocr
