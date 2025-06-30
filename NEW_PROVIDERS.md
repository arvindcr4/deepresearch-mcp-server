# New Research Providers: Firecrawl & Agentspace Integration

## Overview

Two new deep research providers have been added to the deepresearch-mcp-server:

1. **Firecrawl Deep Research API** - Advanced web crawling and content extraction
2. **Google Deep Research (via Agentspace)** - Comprehensive Google-powered research with analysis

## Firecrawl Provider

### Features
- **Advanced Web Crawling**: Intelligent content extraction from web pages
- **Clean Content**: Removes ads, navigation, and other noise
- **Multiple Formats**: Supports text, markdown, and HTML extraction
- **Search Capabilities**: Built-in search functionality

### Tool: `firecrawl-deep-research`

#### Parameters
- `query` (required): The research query to search for
- `options` (optional):
  - `maxResults`: Maximum number of results (default: 10)
  - `browsePage`: URL to crawl for additional context
  - `onlyMainContent`: Extract only main content (default: true)
  - `includeHtml`: Include HTML in response (default: false)

#### Example Usage
```bash
npm run cli search "artificial intelligence trends 2024" --provider firecrawl
```

## Agentspace Provider (Google Deep Research)

### Features
- **Google Deep Research**: Leverages Google's search capabilities
- **Comprehensive Analysis**: Includes insights and analysis
- **Multiple Depth Levels**: Quick, standard, or comprehensive research
- **Regional/Language Support**: Configurable search parameters
- **Advanced Content Extraction**: Clean web page content extraction

### Tool: `agentspace-google-research`

#### Parameters
- `query` (required): The research query
- `options` (optional):
  - `maxResults`: Maximum number of results (default: 10)
  - `depth`: Research depth - "quick", "standard", or "comprehensive" (default: comprehensive)
  - `includeAnalysis`: Include AI-powered analysis (default: true)
  - `language`: Search language (default: "en")
  - `region`: Search region (default: "us")
  - `browsePage`: URL to extract content from

#### Example Usage
```bash
npm run cli search "climate change solutions" --provider agentspace --depth comprehensive
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Firecrawl Configuration
FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# Agentspace Configuration
AGENTSPACE_API_KEY=your_agentspace_api_key_here
AGENTSPACE_BASE_URL=https://api.agentspace.dev
```

### API Key Setup

#### Firecrawl
1. Sign up at [Firecrawl](https://firecrawl.dev)
2. Get your API key from the dashboard
3. Add it to your environment variables

#### Agentspace
1. Sign up at [Agentspace](https://agentspace.dev)
2. Get your API key from the dashboard
3. Add it to your environment variables

## MCP Tool Integration

Both providers are fully integrated with the MCP (Model Context Protocol) server and can be used by LLM agents:

### Available Tools

1. **firecrawl-deep-research**: Advanced web crawling and content extraction
2. **agentspace-google-research**: Google Deep Research with comprehensive analysis

### CLI Commands

Check configuration status:
```bash
npm run cli config
```

Perform research with auto-provider selection:
```bash
npm run cli search "your research query"
```

Use specific provider:
```bash
npm run cli search "your query" --provider firecrawl
npm run cli search "your query" --provider agentspace
```

## Advanced Features

### Firecrawl Capabilities
- Handles JavaScript-rendered content
- Removes advertisements and navigation
- Extracts structured data
- Supports screenshot capture
- Rate limiting and error handling

### Agentspace Capabilities  
- Google's search index integration
- AI-powered content analysis
- Multiple perspective support (neutral, academic, business, technical)
- Citation and source tracking
- Counter-argument analysis
- Comprehensive research depth control

## Error Handling

Both providers include comprehensive error handling:
- API key validation
- Rate limiting compliance
- Network error recovery
- Response validation
- Detailed logging

## Integration Status

✅ **Completed Features:**
- Provider classes implemented
- MCP tool registration
- CLI integration
- Configuration management
- Error handling
- Documentation

🔄 **Available for Use:**
- Both providers are ready for production use
- Full MCP server integration
- CLI support for testing
- Agent-compatible tool interfaces

## Next Steps

1. **Set up API keys** in your `.env` file
2. **Test the providers** using the CLI
3. **Configure your MCP client** to use the new tools
4. **Start researching** with enhanced capabilities!

## Support

For issues or questions:
- Check the main README.md for general setup
- Review the .env.example for configuration examples
- Use `npm run cli config` to verify setup
- Check logs for detailed error information
