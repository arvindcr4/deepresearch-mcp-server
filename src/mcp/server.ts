#!/usr/bin/env node
import express from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { config } from '../config/index.js'
import { BaseErrorCode, McpError } from '../types/errors.js'
import { secureLogger } from '../utils/secureLogger.js'
import { configureSecurity } from '../utils/security.js'
import { initializeNeo4jSchema } from '../services/neo4j/index.js'
import { UnifiedDeepResearchTool } from './tools/deep-research-unified.js'
import {
  createValidationMiddleware,
  zDeepResearchQuery,
} from '../middleware/validation.js'
import { requestLogger, errorLogger } from '../middleware/requestLogger.js'
import { gracefulShutdown } from '../utils/gracefulShutdown.js'

// Import tool registrations
import { registerAtlasProjectCreateTool } from './tools/atlas_project_create/index.js'
import { registerAtlasProjectDeleteTool } from './tools/atlas_project_delete/index.js'
import { registerAtlasProjectListTool } from './tools/atlas_project_list/index.js'
import { registerAtlasProjectUpdateTool } from './tools/atlas_project_update/index.js'
import { registerAtlasTaskCreateTool } from './tools/atlas_task_create/index.js'
import { registerAtlasTaskDeleteTool } from './tools/atlas_task_delete/index.js'
import { registerAtlasTaskListTool } from './tools/atlas_task_list/index.js'
import { registerAtlasTaskUpdateTool } from './tools/atlas_task_update/index.js'
import { registerAtlasDatabaseCleanTool } from './tools/atlas_database_clean/index.js'
import { registerAtlasKnowledgeAddTool } from './tools/atlas_knowledge_add/index.js'
import { registerAtlasKnowledgeDeleteTool } from './tools/atlas_knowledge_delete/index.js'
import { registerAtlasKnowledgeListTool } from './tools/atlas_knowledge_list/index.js'
import { registerAtlasUnifiedSearchTool } from './tools/atlas_unified_search/index.js'
import { registerAtlasDeepResearchTool } from './tools/atlas_deep_research/index.js'

// Import resource registrations
import { registerMcpResources } from './resources/index.js'

export const createMcpServer = async () => {
  try {
    // Configure security settings
    configureSecurity({
      authRequired: config.security.authRequired,
    })

    // Initialize Neo4j database and services
    secureLogger.info('Initializing Neo4j schema...')
    await initializeNeo4jSchema()
    secureLogger.info('Neo4j schema initialized successfully')

    const server = new McpServer({
      name: config.mcpServerName,
      version: config.mcpServerVersion,
      capabilities: {
        resources: {},
        tools: {
          // Define global tool capabilities
          requestContext: true, // Enable request context for all tools
          rateLimit: {
            windowMs: 60 * 1000, // 1 minute default window
            maxRequests: 100, // 100 requests per minute default
          },
          permissions: {
            required: config.security.authRequired, // Make permissions optional based on security config
          },
        },
      },
    })

    // Register tools
    registerAtlasProjectCreateTool(server) // atlas_project_create
    registerAtlasProjectListTool(server) // atlas_project_list
    registerAtlasProjectUpdateTool(server) // atlas_project_update
    registerAtlasProjectDeleteTool(server) // atlas_project_delete
    registerAtlasTaskCreateTool(server) // atlas_task_create
    registerAtlasTaskDeleteTool(server) // atlas_task_delete
    registerAtlasTaskListTool(server) // atlas_task_list
    registerAtlasTaskUpdateTool(server) // atlas_task_update
    registerAtlasDatabaseCleanTool(server) // atlas_database_clean
    registerAtlasKnowledgeAddTool(server) // atlas_knowledge_add
    registerAtlasKnowledgeDeleteTool(server) // atlas_knowledge_delete
    registerAtlasKnowledgeListTool(server) // atlas_knowledge_list
    registerAtlasUnifiedSearchTool(server) // atlas_unified_search
    registerAtlasDeepResearchTool(server) // atlas_deep_research (Register the new tool)

    // Register resources
    registerMcpResources(server)

    // Connect using stdio transport
    const transport = new StdioServerTransport()
    await server.connect(transport)

    secureLogger.info('ATLAS MCP Server running on stdio', {
      name: config.mcpServerName,
      version: config.mcpServerVersion,
      authRequired: config.security.authRequired,
    })

    return server
  } catch (error) {
    // Handle initialization errors
    secureLogger.error(
      'Failed to initialize MCP server',
      error instanceof Error ? error : new Error('Unknown error')
    )

    throw new McpError(
      BaseErrorCode.INTERNAL_ERROR,
      `Failed to initialize MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Create HTTP server with express endpoints
 */
export const createHttpServer = async (port: number = 3000) => {
  try {
    // Configure security settings
    configureSecurity({
      authRequired: config.security.authRequired,
    })

    // Initialize Neo4j database and services
    secureLogger.info('Initializing Neo4j schema for HTTP server...')
    await initializeNeo4jSchema()
    secureLogger.info('Neo4j schema initialized successfully for HTTP server')

    const app = express()

    // Middleware
    app.use(express.json({ limit: '10mb' }))
    app.use(express.urlencoded({ extended: true }))

    // Request logging middleware (should be early in the chain)
    app.use(requestLogger)

    // CORS middleware
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      )
      res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      )
      if (req.method === 'OPTIONS') {
        res.sendStatus(200)
      } else {
        next()
      }
    })

    // Health check endpoint
    app.get('/healthz', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: config.mcpServerName,
        version: config.mcpServerVersion,
      })
    })

    // Deep research endpoint
    app.post(
      '/deep-research',
      createValidationMiddleware(zDeepResearchQuery, 'body'),
      async (req, res) => {
        try {
          const validatedData = (req as any).validatedBody
          const deepResearchTool = new UnifiedDeepResearchTool()

          secureLogger.info('HTTP deep research request', {
            query: validatedData.query,
            provider: validatedData.provider,
          })

          const result = await deepResearchTool.execute(validatedData)

          res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          secureLogger.error('HTTP deep research failed', { error })

          if (error instanceof McpError) {
            res.status(400).json({
              success: false,
              error: error.code,
              message: error.message,
              timestamp: new Date().toISOString(),
            })
          } else {
            res.status(500).json({
              success: false,
              error: 'INTERNAL_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            })
          }
        }
      }
    )

    // Error logging middleware
    app.use(errorLogger)

    // Global error handler
    app.use(
      (
        error: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        secureLogger.error('HTTP server error', {
          error,
          path: req.path,
          method: req.method,
        })

        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Internal server error',
            timestamp: new Date().toISOString(),
          })
        }
      }
    )

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Endpoint ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      })
    })

    // Start server
    const server = app.listen(port, () => {
      secureLogger.info(`Deep Research HTTP Server running`, {
        port,
        name: config.mcpServerName,
        version: config.mcpServerVersion,
        endpoints: ['/deep-research', '/healthz'],
      })
    })

    // Register server for graceful shutdown
    gracefulShutdown.registerServer(server)
    gracefulShutdown.initialize()

    return server
  } catch (error) {
    secureLogger.error(
      'Failed to initialize HTTP server',
      error instanceof Error ? error : new Error('Unknown error')
    )

    throw new McpError(
      BaseErrorCode.INTERNAL_ERROR,
      `Failed to initialize HTTP server: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
