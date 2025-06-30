import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'
import { z } from 'zod'
import Bottleneck from 'bottleneck'
import { readFileSync, mkdirSync, existsSync, statSync } from 'fs'
import path, { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { safeJsonParse } from '../schemas/neo4jValidation.js'

// Load and expand environment variables
const myEnv = dotenv.config()
dotenvExpand.expand(myEnv)

// API Key validation patterns
const API_KEY_PATTERNS = {
  openai: /^sk-[A-Za-z0-9]{48,}$/,
  perplexity: /^pplx-[A-Za-z0-9]{48,}$/,
  xaiGrok: /^xai-[A-Za-z0-9]+$/,
}

/**
 * Validates API key formats without exposing the actual keys
 */
function validateApiKeys(apiKeys: Config['apiKeys']): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Only validate if keys are provided
  if (apiKeys.openai && !API_KEY_PATTERNS.openai.test(apiKeys.openai)) {
    errors.push('OpenAI API key format is invalid (should start with sk-)')
  }

  if (
    apiKeys.perplexity &&
    !API_KEY_PATTERNS.perplexity.test(apiKeys.perplexity)
  ) {
    errors.push(
      'Perplexity API key format is invalid (should start with pplx-)'
    )
  }

  if (apiKeys.xaiGrok && !API_KEY_PATTERNS.xaiGrok.test(apiKeys.xaiGrok)) {
    errors.push('XAI Grok API key format is invalid (should start with xai-)')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// --- Determine Project Root ---
/**
 * Finds the project root directory by searching upwards for package.json.
 * @param startDir The directory to start searching from.
 * @returns The absolute path to the project root, or throws an error if not found.
 */
const findProjectRoot = (startDir: string): string => {
  let currentDir = startDir
  while (true) {
    const packageJsonPath = join(currentDir, 'package.json')
    if (existsSync(packageJsonPath)) {
      // Log successful discovery without exposing full path in production
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Project root found at: ${currentDir}`)
      }
      return currentDir
    }
    const parentDir = dirname(currentDir)
    if (parentDir === currentDir) {
      // Reached the filesystem root without finding package.json
      throw new Error(
        `Could not find project root (package.json) starting from ${startDir}`
      )
    }
    currentDir = parentDir
  }
}

let projectRoot: string
try {
  const currentModuleDir = dirname(fileURLToPath(import.meta.url))
  projectRoot = findProjectRoot(currentModuleDir)
} catch (error) {
  console.error(`FATAL: Error determining project root`)
  // Only log error details in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(error instanceof Error ? error.message : String(error))
  }
  // Fallback or exit if root cannot be determined
  projectRoot = process.cwd() // Fallback to cwd as a last resort, though likely problematic
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`Warning: Using process.cwd() as fallback project root.`)
  }
  // Consider exiting: process.exit(1);
}
// --- End Determine Project Root ---

// --- Reading package.json ---
// Define package.json schema
const packageJsonSchema = z
  .object({
    name: z.string(),
    version: z.string(),
  })
  .passthrough() // Allow additional properties

// Resolve package.json path relative to project root for safety
const packageJsonPath = path.resolve(projectRoot, 'package.json')
let pkg: { name: string; version: string }
try {
  // Security Check: Ensure we are reading from within the project root
  if (!packageJsonPath.startsWith(projectRoot + path.sep)) {
    throw new Error(
      `package.json path resolves outside project root: ${packageJsonPath}`
    )
  }
  const packageContent = readFileSync(packageJsonPath, 'utf-8')
  pkg = safeJsonParse(packageContent, packageJsonSchema, 'package.json')
} catch (error) {
  console.error(
    `FATAL: Could not read or parse package.json. Check file permissions and JSON syntax.`
  )
  if (process.env.NODE_ENV !== 'production') {
    console.error(
      `Details: ${error instanceof Error ? error.message : String(error)}`
    )
  }
  // Assign default values or re-throw, depending on how critical this is.
  // For now, let's assign defaults and log the error.
  pkg = { name: 'atlas-mcp-server-unknown', version: '0.0.0' }
}
// --- End Reading package.json ---

// --- Backup Directory Handling ---
/**
 * Ensures the backup directory exists and is within the project root.
 * @param backupPath The desired path for the backup directory (can be relative or absolute).
 * @param rootDir The root directory of the project to contain the backups.
 * @returns The validated, absolute path to the backup directory, or null if invalid.
 */
const ensureBackupDir = (
  backupPath: string,
  rootDir: string
): string | null => {
  const resolvedBackupPath = path.resolve(rootDir, backupPath) // Resolve relative to root

  // Security Check: Ensure the resolved path is within the project root
  if (
    !resolvedBackupPath.startsWith(rootDir + path.sep) &&
    resolvedBackupPath !== rootDir
  ) {
    console.error(`Error: Backup path resolves outside the project boundary`)
    return null // Indicate failure
  }

  if (!existsSync(resolvedBackupPath)) {
    try {
      mkdirSync(resolvedBackupPath, { recursive: true })
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Created backup directory: ${resolvedBackupPath}`)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`Error creating backup directory: ${errorMessage}`)
      return null // Indicate failure
    }
  } else {
    // Optional: Check if it's actually a directory if it exists
    try {
      const stats = statSync(resolvedBackupPath) // Use imported statSync directly
      if (!stats.isDirectory()) {
        console.error(`Error: Backup path exists but is not a directory.`)
        return null
      }
    } catch (statError) {
      console.error(
        `Error accessing backup path: ${statError instanceof Error ? statError.message : String(statError)}`
      )
      return null
    }
  }
  return resolvedBackupPath // Return the validated absolute path
}

// Determine the desired backup path (relative or absolute from env var, or default)
const rawBackupPathInput = process.env.BACKUP_FILE_DIR || 'backups' // Default relative path

// Ensure the backup directory exists and get the validated absolute path
const validatedBackupPath = ensureBackupDir(rawBackupPathInput, projectRoot)

if (!validatedBackupPath) {
  console.error(
    'FATAL: Backup directory configuration is invalid or could not be created. Exiting.'
  )
  process.exit(1) // Exit if backup path is invalid
}
// --- End Backup Directory Handling ---

// --- Zod Configuration Schema ---
const ConfigSchema = z.object({
  // Neo4j Configuration
  neo4jUri: z.string().url().default('bolt://localhost:7687'),
  neo4jUser: z.string().default('neo4j'),
  neo4jPassword: z.string().min(1, 'Neo4j password is required'),

  // Application Configuration
  mcpServerName: z.string().default(pkg.name),
  mcpServerVersion: z.string().default(pkg.version),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  environment: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // API Keys
  apiKeys: z.object({
    openai: z.string().optional(),
    perplexity: z.string().optional(),
    xaiGrok: z.string().optional(),
  }),

  // Rate Limiting Configuration
  rateLimits: z.object({
    global: z.number().int().positive().default(30),
    openai: z.number().int().positive().default(50),
    perplexity: z.number().int().positive().default(30),
    xaiGrok: z.number().int().positive().default(40),
  }),

  // Backup Configuration
  backup: z.object({
    maxBackups: z.number().int().positive().default(10),
    backupPath: z.string().min(1),
  }),

  // Security Configuration
  security: z.object({
    authRequired: z.boolean().default(true), // Default to true for security
  }),

  // Transaction Configuration
  transaction: z.object({
    maxRetries: z.number().int().positive().default(3),
    initialRetryDelayMs: z.number().int().positive().default(100),
    maxRetryDelayMs: z.number().int().positive().default(5000),
    backoffMultiplier: z.number().positive().default(2),
    timeout: z.number().int().positive().default(30000), // 30 seconds
  }),
})

type Config = z.infer<typeof ConfigSchema>

// --- Parse and Validate Configuration ---
const rawConfig = {
  neo4jUri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4jUser: process.env.NEO4J_USER || 'neo4j',
  neo4jPassword: process.env.NEO4J_PASSWORD,
  mcpServerName: pkg.name,
  mcpServerVersion: pkg.version,
  logLevel: process.env.LOG_LEVEL || 'info',
  environment: process.env.NODE_ENV || 'development',
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY,
    xaiGrok: process.env.XAI_GROK_API_KEY,
  },
  rateLimits: {
    global: parseInt(process.env.GLOBAL_RATE_LIMIT || '30', 10),
    openai: parseInt(process.env.OPENAI_RATE_LIMIT || '50', 10),
    perplexity: parseInt(process.env.PERPLEXITY_RATE_LIMIT || '30', 10),
    xaiGrok: parseInt(process.env.XAI_GROK_RATE_LIMIT || '40', 10),
  },
  backup: {
    maxBackups: parseInt(process.env.BACKUP_MAX_COUNT || '10', 10),
    backupPath: validatedBackupPath,
  },
  security: {
    authRequired: process.env.AUTH_REQUIRED === 'false' ? false : true, // Default to true for security
  },
  transaction: {
    maxRetries: parseInt(process.env.TRANSACTION_MAX_RETRIES || '3', 10),
    initialRetryDelayMs: parseInt(
      process.env.TRANSACTION_INITIAL_RETRY_DELAY_MS || '100',
      10
    ),
    maxRetryDelayMs: parseInt(
      process.env.TRANSACTION_MAX_RETRY_DELAY_MS || '5000',
      10
    ),
    backoffMultiplier: parseFloat(
      process.env.TRANSACTION_BACKOFF_MULTIPLIER || '2'
    ),
    timeout: parseInt(process.env.TRANSACTION_TIMEOUT_MS || '30000', 10),
  },
}

// Validate required environment variables before parsing config
const requiredEnvVars = [
  { name: 'NEO4J_PASSWORD', value: process.env.NEO4J_PASSWORD },
]

const missingVars = requiredEnvVars.filter((v) => !v.value).map((v) => v.name)

if (missingVars.length > 0) {
  console.error('\n❌ Missing required environment variables:')
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`)
  })
  console.error(
    '\nPlease set all required environment variables in your .env file.'
  )
  console.error('See .env.example for reference.\n')
  process.exit(1)
}

// Validate configuration
let config: Config
try {
  config = ConfigSchema.parse(rawConfig)
  console.log('Configuration validated successfully')

  // Validate API key formats without exposing them
  const apiKeyValidation = validateApiKeys(config.apiKeys)
  if (!apiKeyValidation.valid) {
    console.error('API key validation failed:', apiKeyValidation.errors)
    process.exit(1)
  }
} catch (error) {
  console.error('Configuration validation failed')
  if (error instanceof z.ZodError) {
    // Log validation errors without exposing sensitive data
    const sanitizedErrors = error.errors.map((err) => ({
      ...err,
      path: err.path,
      message: err.message.replace(/["'].*["']/g, '[REDACTED]'),
    }))
    console.error('Validation errors:', sanitizedErrors)
  }
  process.exit(1)
}

// --- Rate Limiting with Bottleneck ---
export type ProviderName = 'openai' | 'perplexity' | 'xaiGrok' | 'global'

class RateLimitManager {
  private limiters: Map<ProviderName, Bottleneck> = new Map()

  constructor(rateLimits: Config['rateLimits']) {
    // Create Bottleneck instances for each provider
    this.limiters.set(
      'global',
      new Bottleneck({
        reservoir: rateLimits.global,
        reservoirRefreshAmount: rateLimits.global,
        reservoirRefreshInterval: 60 * 1000, // 1 minute
        maxConcurrent: 5,
      })
    )

    this.limiters.set(
      'openai',
      new Bottleneck({
        reservoir: rateLimits.openai,
        reservoirRefreshAmount: rateLimits.openai,
        reservoirRefreshInterval: 60 * 1000, // 1 minute
        maxConcurrent: 3,
      })
    )

    this.limiters.set(
      'perplexity',
      new Bottleneck({
        reservoir: rateLimits.perplexity,
        reservoirRefreshAmount: rateLimits.perplexity,
        reservoirRefreshInterval: 60 * 1000, // 1 minute
        maxConcurrent: 2,
      })
    )

    this.limiters.set(
      'xaiGrok',
      new Bottleneck({
        reservoir: rateLimits.xaiGrok,
        reservoirRefreshAmount: rateLimits.xaiGrok,
        reservoirRefreshInterval: 60 * 1000, // 1 minute
        maxConcurrent: 2,
      })
    )
  }

  /**
   * Get the rate limiter for a specific provider
   */
  getLimiter(provider: ProviderName): Bottleneck {
    const limiter = this.limiters.get(provider)
    if (!limiter) {
      throw new Error(`Rate limiter not found for provider: ${provider}`)
    }
    return limiter
  }

  /**
   * Schedule a function to run with rate limiting
   */
  async schedule<T>(provider: ProviderName, fn: () => Promise<T>): Promise<T> {
    const limiter = this.getLimiter(provider)
    return limiter.schedule(fn)
  }

  /**
   * Get current rate limit status for a provider
   */
  async getStatus(provider: ProviderName) {
    const limiter = this.getLimiter(provider)
    return {
      queued: limiter.queued(),
      running: await limiter.running(),
    }
  }

  /**
   * Get status for all providers
   */
  async getAllStatus() {
    const status: Record<string, { queued: number; running: number }> = {}
    for (const [provider, limiter] of this.limiters) {
      status[provider] = {
        queued: limiter.queued(),
        running: await limiter.running(),
      }
    }
    return status
  }
}

// Create rate limit manager instance
const rateLimitManager = new RateLimitManager(config.rateLimits)

// Backward compatibility - add apis property
const configWithApis = {
  ...config,
  apis: {
    openai: { apiKey: config.apiKeys.openai },
    perplexity: { apiKey: config.apiKeys.perplexity },
    grok: { apiKey: config.apiKeys.xaiGrok },
    firecrawl: { apiKey: process.env.FIRECRAWL_API_KEY },
    agentspace: {
      apiKey: process.env.AGENTSPACE_API_KEY,
      baseUrl: process.env.AGENTSPACE_BASE_URL,
    },
  },
}

// Export configuration and rate limiting utilities
export { configWithApis as config, rateLimitManager, type Config, ConfigSchema }

// Export individual rate limiters for backward compatibility
export const rateLimiters = {
  global: rateLimitManager.getLimiter('global'),
  openai: rateLimitManager.getLimiter('openai'),
  perplexity: rateLimitManager.getLimiter('perplexity'),
  xaiGrok: rateLimitManager.getLimiter('xaiGrok'),
}
