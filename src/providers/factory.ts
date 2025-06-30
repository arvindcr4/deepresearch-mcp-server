import { DeepResearchProvider } from './index.js'
import { OpenAIProvider } from './openai.js'
import { PerplexityProvider } from './perplexity.js'
import { GrokProvider } from './grok.js'
import { config } from '../config/index.js'
import { McpError, BaseErrorCode } from '../utils/errors.js'

export type ProviderType = 'openai' | 'perplexity' | 'grok'

/**
 * Factory class implementing the Strategy pattern for deep research providers.
 * This centralizes provider instantiation and management, allowing the unified
 * deep research tool to work with any provider seamlessly.
 */
export class ProviderFactory {
  private static instances: Map<ProviderType, DeepResearchProvider> = new Map()

  /**
   * Get a provider instance using the Strategy pattern.
   * Providers are cached for reuse across requests.
   *
   * @param provider - The provider type to instantiate
   * @returns A DeepResearchProvider instance
   * @throws McpError if the provider is not supported or not configured
   */
  static get(provider: ProviderType): DeepResearchProvider {
    // Return cached instance if available
    if (this.instances.has(provider)) {
      return this.instances.get(provider)!
    }

    // Create new instance based on provider type
    let providerInstance: DeepResearchProvider

    switch (provider) {
      case 'openai':
        if (!config.apis.openai?.apiKey) {
          throw new McpError(
            BaseErrorCode.INVALID_REQUEST,
            'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.'
          )
        }
        providerInstance = new OpenAIProvider(config.apis.openai.apiKey)
        break

      case 'perplexity':
        if (!config.apis.perplexity?.apiKey) {
          throw new McpError(
            BaseErrorCode.INVALID_REQUEST,
            'Perplexity API key not configured. Please set PERPLEXITY_API_KEY environment variable.'
          )
        }
        providerInstance = new PerplexityProvider(config.apis.perplexity.apiKey)
        break

      case 'grok':
        if (!config.apis.grok?.apiKey) {
          throw new McpError(
            BaseErrorCode.INVALID_REQUEST,
            'Grok API key not configured. Please set GROK_API_KEY environment variable.'
          )
        }
        providerInstance = new GrokProvider(config.apis.grok.apiKey)
        break

      default:
        throw new McpError(
          BaseErrorCode.INVALID_REQUEST,
          `Unsupported provider: ${provider}. Supported providers: openai, perplexity, grok`
        )
    }

    // Cache the instance for reuse
    this.instances.set(provider, providerInstance)
    return providerInstance
  }

  /**
   * Get all available provider types that are properly configured.
   * This can be used to validate provider options or provide user feedback.
   *
   * @returns Array of configured provider types
   */
  static getAvailableProviders(): ProviderType[] {
    const available: ProviderType[] = []

    if (config.apis.openai?.apiKey) {
      available.push('openai')
    }
    if (config.apis.perplexity?.apiKey) {
      available.push('perplexity')
    }
    if (config.apis.grok?.apiKey) {
      available.push('grok')
    }

    return available
  }

  /**
   * Check if a specific provider is available (configured with API key).
   *
   * @param provider - The provider type to check
   * @returns boolean indicating if the provider is available
   */
  static isProviderAvailable(provider: ProviderType): boolean {
    return this.getAvailableProviders().includes(provider)
  }

  /**
   * Clear all cached provider instances. Useful for testing or configuration updates.
   */
  static clearInstances(): void {
    this.instances.clear()
  }

  /**
   * Get the default provider based on availability and preference.
   * Priority: openai > perplexity > grok
   *
   * @returns The default provider type
   * @throws McpError if no providers are available
   */
  static getDefaultProvider(): ProviderType {
    const available = this.getAvailableProviders()

    if (available.length === 0) {
      throw new McpError(
        BaseErrorCode.INVALID_REQUEST,
        'No deep research providers are configured. Please set at least one API key: OPENAI_API_KEY, PERPLEXITY_API_KEY, or GROK_API_KEY'
      )
    }

    // Return providers in order of preference
    if (available.includes('openai')) return 'openai'
    if (available.includes('perplexity')) return 'perplexity'
    if (available.includes('grok')) return 'grok'

    // This should never happen due to the length check above, but TypeScript safety
    return available[0]
  }
}
