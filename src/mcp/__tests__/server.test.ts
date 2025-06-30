/**
 * Unit Tests for MCP Server
 */

/// <reference types="jest" />

/**
 * Unit Tests for MCP Server
 */

import { BaseErrorCode, McpError } from '../../types/errors.js'

// Mock dependencies
const mockMcpServer = {
  connect: jest.fn(),
}

const mockStdioTransport = {}

const mockExpressApp = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  listen: jest.fn(),
}

const mockServer = {
  close: jest.fn(),
}

const mockUnifiedDeepResearchTool = {
  execute: jest.fn(),
}

// Mock McpServer constructor
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => mockMcpServer),
}))

// Mock StdioServerTransport
jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => mockStdioTransport),
}))

// Mock express
jest.mock('express', () => {
  const express = jest.fn(() => mockExpressApp)
  express.json = jest.fn(() => (req: any, res: any, next: any) => next())
  express.urlencoded = jest.fn(() => (req: any, res: any, next: any) => next())
  return { default: express }
})

// Mock config
jest.mock('../../config/index.js', () => ({
  config: {
    mcpServerName: 'Test MCP Server',
    mcpServerVersion: '1.0.0-test',
    security: {
      authRequired: false,
    },
  },
}))

// Mock security utils
jest.mock('../../utils/security.js', () => ({
  configureSecurity: jest.fn(),
}))

// Mock logger
jest.mock('../../utils/secureLogger.js', () => ({
  secureLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock Neo4j initialization
jest.mock('../../services/neo4j/index.js', () => ({
  initializeNeo4jSchema: jest.fn(),
}))

// Mock validation middleware
jest.mock('../../middleware/validation.js', () => ({
  createValidationMiddleware: jest.fn(() => (req: any, res: any, next: any) => {
    req.validatedBody = req.body
    next()
  }),
  zDeepResearchQuery: {},
}))

// Mock request logger
jest.mock('../../middleware/requestLogger.js', () => ({
  requestLogger: jest.fn((req: any, res: any, next: any) => next()),
  errorLogger: jest.fn((req: any, res: any, next: any) => next()),
}))

// Mock graceful shutdown
jest.mock('../../utils/gracefulShutdown.js', () => ({
  gracefulShutdown: {
    registerServer: jest.fn(),
    initialize: jest.fn(),
  },
}))

// Mock UnifiedDeepResearchTool
jest.mock('../tools/deep-research-unified.js', () => ({
  UnifiedDeepResearchTool: jest.fn().mockImplementation(() => mockUnifiedDeepResearchTool),
}))

// Mock all tool registrations
const mockRegisterTool = jest.fn()
jest.mock('../tools/atlas_project_create/index.js', () => ({
  registerAtlasProjectCreateTool: mockRegisterTool,
}))
jest.mock('../tools/atlas_project_delete/index.js', () => ({
  registerAtlasProjectDeleteTool: mockRegisterTool,
}))
jest.mock('../tools/atlas_project_list/index.js', () => ({
  registerAtlasProjectListTool: mockRegisterTool,
}))
jest.mock('../tools/atlas_project_update/index.js', () => ({
  registerAtlasProjectUpdateTool: mockRegisterTool,
}))
jest.mock('../tools/atlas_task_create/index.js', () => ({
  registerAtlasTaskCreateTool: mockRegisterTool,
}))
jest.mock('../tools/atlas_task_delete/index.js', () => ({
  registerAtlasTaskDeleteTool: mockRegisterTool,
}))
jest.mock('../tools/atlas_task_list/index.js', () => ({
  registerAtlasTaskListTool: mockRegisterTool,
}))
jest.mock('../tools/atlas_task_update/index.js', () => ({
  registerAtlasTaskUpdateTool: mockRegisterTool,
}))
jest.mock('../tools/atlas_database_clean/index.js', () => ({
  registerAtlasDatabaseCleanTool: mockRegisterTool,
}))
jest.mock('../tools/atlas_knowledge_add/index.js', () => ({
  registerAtlasKnowledgeAddTool: mockRegisterTool,
}))
jest.mock('../tools/atlas_knowledge_delete/index.js', () => ({
  registerAtlasKnowledgeDeleteTool: mockRegisterTool,
}))
jest.mock('../tools/atlas_knowledge_list/index.js', () => ({
  registerAtlasKnowledgeListTool: mockRegisterTool,
}))
jest.mock('../tools/atlas_unified_search/index.js', () => ({
  registerAtlasUnifiedSearchTool: mockRegisterTool,
}))
jest.mock('../tools/atlas_deep_research/index.js', () => ({
  registerAtlasDeepResearchTool: mockRegisterTool,
}))

// Mock resource registration
jest.mock('../resources/index.js', () => ({
  registerMcpResources: jest.fn(),
}))

describe('MCP Server', () => {
  let createMcpServer: any
  let createHttpServer: any
  let McpServer: any
  let StdioServerTransport: any
  let express: any
  let secureLogger: any
  let initializeNeo4jSchema: any
  let configureSecurity: any
  let gracefulShutdown: any

  beforeEach(async () => {
    jest.clearAllMocks()

    // Reset express app mocks
    mockExpressApp.use.mockClear()
    mockExpressApp.get.mockClear()
    mockExpressApp.post.mockClear()
    mockExpressApp.listen.mockReturnValue(mockServer)

    // Dynamic imports to ensure mocks are applied
    const serverModule = await import('../server.js')
    createMcpServer = serverModule.createMcpServer
    createHttpServer = serverModule.createHttpServer

    const mcpModule = await import('@modelcontextprotocol/sdk/server/mcp.js')
    McpServer = mcpModule.McpServer

    const stdioModule = await import('@modelcontextprotocol/sdk/server/stdio.js')
    StdioServerTransport = stdioModule.StdioServerTransport

    const expressModule = await import('express')
    express = expressModule.default

    const loggerModule = await import('../../utils/secureLogger.js')
    secureLogger = loggerModule.secureLogger

    const neo4jModule = await import('../../services/neo4j/index.js')
    initializeNeo4jSchema = neo4jModule.initializeNeo4jSchema

    const securityModule = await import('../../utils/security.js')
    configureSecurity = securityModule.configureSecurity

    const shutdownModule = await import('../../utils/gracefulShutdown.js')
    gracefulShutdown = shutdownModule.gracefulShutdown
  })

  describe('createMcpServer', () => {
    it('should create and configure MCP server successfully', async () => {
      mockMcpServer.connect.mockResolvedValue(undefined)
      initializeNeo4jSchema.mockResolvedValue(undefined)

      const server = await createMcpServer()

      expect(configureSecurity).toHaveBeenCalledWith({
        authRequired: false,
      })
      expect(initializeNeo4jSchema).toHaveBeenCalled()
      expect(McpServer).toHaveBeenCalledWith({
        name: 'Test MCP Server',
        version: '1.0.0-test',
        capabilities: {
          resources: {},
          tools: {
            requestContext: true,
            rateLimit: {
              windowMs: 60 * 1000,
              maxRequests: 100,
            },
            permissions: {
              required: false,
            },
          },
        },
      })
      expect(mockRegisterTool).toHaveBeenCalledTimes(14) // All tool registrations
      expect(StdioServerTransport).toHaveBeenCalled()
      expect(mockMcpServer.connect).toHaveBeenCalledWith(mockStdioTransport)
      expect(secureLogger.info).toHaveBeenCalledWith(
        'ATLAS MCP Server running on stdio',
        {
          name: 'Test MCP Server',
          version: '1.0.0-test',
          authRequired: false,
        }
      )
      expect(server).toBe(mockMcpServer)
    })

    it('should handle Neo4j initialization errors', async () => {
      const error = new Error('Neo4j connection failed')
      initializeNeo4jSchema.mockRejectedValue(error)

      await expect(createMcpServer()).rejects.toThrow(McpError)
      await expect(createMcpServer()).rejects.toThrow(
        'Failed to initialize MCP server: Neo4j connection failed'
      )

      expect(secureLogger.error).toHaveBeenCalledWith(
        'Failed to initialize MCP server',
        error
      )
    })

    it('should handle server connection errors', async () => {
      initializeNeo4jSchema.mockResolvedValue(undefined)
      const error = new Error('Server connection failed')
      mockMcpServer.connect.mockRejectedValue(error)

      await expect(createMcpServer()).rejects.toThrow(McpError)
      await expect(createMcpServer()).rejects.toThrow(
        'Failed to initialize MCP server: Server connection failed'
      )

      expect(secureLogger.error).toHaveBeenCalledWith(
        'Failed to initialize MCP server',
        error
      )
    })

    it('should handle unknown errors', async () => {
      initializeNeo4jSchema.mockRejectedValue('Unknown error string')

      await expect(createMcpServer()).rejects.toThrow(McpError)
      await expect(createMcpServer()).rejects.toThrow(
        'Failed to initialize MCP server: Unknown error'
      )
    })

    it('should log Neo4j schema initialization progress', async () => {
      initializeNeo4jSchema.mockResolvedValue(undefined)
      mockMcpServer.connect.mockResolvedValue(undefined)

      await createMcpServer()

      expect(secureLogger.info).toHaveBeenCalledWith('Initializing Neo4j schema...')
      expect(secureLogger.info).toHaveBeenCalledWith('Neo4j schema initialized successfully')
    })
  })

  describe('createHttpServer', () => {
    it('should create and configure HTTP server successfully', async () => {
      initializeNeo4jSchema.mockResolvedValue(undefined)

      const server = await createHttpServer(3000)

      expect(configureSecurity).toHaveBeenCalledWith({
        authRequired: false,
      })
      expect(initializeNeo4jSchema).toHaveBeenCalled()
      expect(express).toHaveBeenCalled()
      expect(mockExpressApp.use).toHaveBeenCalledWith(
        expect.any(Function) // JSON middleware
      )
      expect(mockExpressApp.use).toHaveBeenCalledWith(
        expect.any(Function) // URL encoded middleware
      )
      expect(mockExpressApp.use).toHaveBeenCalledWith(
        expect.any(Function) // Request logger
      )
      expect(mockExpressApp.use).toHaveBeenCalledWith(
        expect.any(Function) // CORS middleware
      )
      expect(mockExpressApp.get).toHaveBeenCalledWith('/healthz', expect.any(Function))
      expect(mockExpressApp.post).toHaveBeenCalledWith(
        '/deep-research',
        expect.any(Function),
        expect.any(Function)
      )
      expect(mockExpressApp.listen).toHaveBeenCalledWith(3000, expect.any(Function))
      expect(gracefulShutdown.registerServer).toHaveBeenCalledWith(mockServer)
      expect(gracefulShutdown.initialize).toHaveBeenCalled()
      expect(server).toBe(mockServer)
    })

    it('should use default port when not specified', async () => {
      initializeNeo4jSchema.mockResolvedValue(undefined)

      await createHttpServer()

      expect(mockExpressApp.listen).toHaveBeenCalledWith(3000, expect.any(Function))
    })

    it('should handle Neo4j initialization errors', async () => {
      const error = new Error('Neo4j connection failed')
      initializeNeo4jSchema.mockRejectedValue(error)

      await expect(createHttpServer(3000)).rejects.toThrow(McpError)
      await expect(createHttpServer(3000)).rejects.toThrow(
        'Failed to initialize HTTP server: Neo4j connection failed'
      )

      expect(secureLogger.error).toHaveBeenCalledWith(
        'Failed to initialize HTTP server',
        error
      )
    })

    it('should log HTTP server initialization progress', async () => {
      initializeNeo4jSchema.mockResolvedValue(undefined)

      await createHttpServer(3000)

      expect(secureLogger.info).toHaveBeenCalledWith(
        'Initializing Neo4j schema for HTTP server...'
      )
      expect(secureLogger.info).toHaveBeenCalledWith(
        'Neo4j schema initialized successfully for HTTP server'
      )
    })

    describe('HTTP endpoints', () => {
      let healthCheckHandler: any
      let deepResearchHandler: any

      beforeEach(async () => {
        initializeNeo4jSchema.mockResolvedValue(undefined)
        await createHttpServer(3000)

        // Extract route handlers
        const getCalls = mockExpressApp.get.mock.calls
        const postCalls = mockExpressApp.post.mock.calls

        healthCheckHandler = getCalls.find(call => call[0] === '/healthz')?.[1]
        deepResearchHandler = postCalls.find(call => call[0] === '/deep-research')?.[2]
      })

      it('should handle health check endpoint', () => {
        const mockReq = {}
        const mockRes = {
          json: jest.fn(),
        }

        healthCheckHandler(mockReq, mockRes)

        expect(mockRes.json).toHaveBeenCalledWith({
          status: 'healthy',
          timestamp: expect.any(String),
          service: 'Test MCP Server',
          version: '1.0.0-test',
        })
      })

      it('should handle deep research endpoint successfully', async () => {
        const mockReq = {
          validatedBody: {
            query: 'test query',
            provider: 'openai',
          },
        }
        const mockRes = {
          json: jest.fn(),
        }

        const mockResult = { answer: 'test answer' }
        mockUnifiedDeepResearchTool.execute.mockResolvedValue(mockResult)

        await deepResearchHandler(mockReq, mockRes)

        expect(mockUnifiedDeepResearchTool.execute).toHaveBeenCalledWith({
          query: 'test query',
          provider: 'openai',
        })
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockResult,
          timestamp: expect.any(String),
        })
        expect(secureLogger.info).toHaveBeenCalledWith('HTTP deep research request', {
          query: 'test query',
          provider: 'openai',
        })
      })

      it('should handle deep research McpError', async () => {
        const mockReq = {
          validatedBody: {
            query: 'test query',
            provider: 'openai',
          },
        }
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        }

                 const error = new McpError(BaseErrorCode.VALIDATION_ERROR, 'Invalid parameters')
        mockUnifiedDeepResearchTool.execute.mockRejectedValue(error)

        await deepResearchHandler(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
                     error: BaseErrorCode.VALIDATION_ERROR,
          message: 'Invalid parameters',
          timestamp: expect.any(String),
        })
        expect(secureLogger.error).toHaveBeenCalledWith('HTTP deep research failed', {
          error,
        })
      })

      it('should handle deep research generic error', async () => {
        const mockReq = {
          validatedBody: {
            query: 'test query',
            provider: 'openai',
          },
        }
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        }

        const error = new Error('Generic error')
        mockUnifiedDeepResearchTool.execute.mockRejectedValue(error)

        await deepResearchHandler(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Generic error',
          timestamp: expect.any(String),
        })
      })

      it('should handle unknown error in deep research', async () => {
        const mockReq = {
          validatedBody: {
            query: 'test query',
            provider: 'openai',
          },
        }
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        }

        mockUnifiedDeepResearchTool.execute.mockRejectedValue('unknown error')

        await deepResearchHandler(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Unknown error',
          timestamp: expect.any(String),
        })
      })
    })

    describe('CORS middleware', () => {
      let corsHandler: any

      beforeEach(async () => {
        initializeNeo4jSchema.mockResolvedValue(undefined)
        await createHttpServer(3000)

        // Find CORS middleware
        const useCalls = mockExpressApp.use.mock.calls
        corsHandler = useCalls.find(call => {
          // Look for the CORS handler by checking if it sets headers
          const handler = call[0]
          if (typeof handler === 'function') {
            const mockRes = {
              header: jest.fn(),
              sendStatus: jest.fn(),
            }
            const mockNext = jest.fn()
            handler({ method: 'GET' }, mockRes, mockNext)
            return mockRes.header.mock.calls.length > 0
          }
          return false
        })?.[0]
      })

      it('should handle OPTIONS requests', () => {
        const mockReq = { method: 'OPTIONS' }
        const mockRes = {
          header: jest.fn(),
          sendStatus: jest.fn(),
        }
        const mockNext = jest.fn()

        corsHandler(mockReq, mockRes, mockNext)

        expect(mockRes.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*')
        expect(mockRes.header).toHaveBeenCalledWith(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, DELETE, OPTIONS'
        )
        expect(mockRes.header).toHaveBeenCalledWith(
          'Access-Control-Allow-Headers',
          'Origin, X-Requested-With, Content-Type, Accept, Authorization'
        )
        expect(mockRes.sendStatus).toHaveBeenCalledWith(200)
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should call next for non-OPTIONS requests', () => {
        const mockReq = { method: 'GET' }
        const mockRes = {
          header: jest.fn(),
          sendStatus: jest.fn(),
        }
        const mockNext = jest.fn()

        corsHandler(mockReq, mockRes, mockNext)

        expect(mockRes.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*')
        expect(mockRes.sendStatus).not.toHaveBeenCalled()
        expect(mockNext).toHaveBeenCalled()
      })
    })
  })
})