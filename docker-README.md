# Docker Setup for DeepResearch MCP Server

This project includes a complete Docker setup with Neo4j database, the MCP server application, and optional Redis caching.

## Quick Start

1. **Copy environment configuration:**
   ```bash
   cp .env.example .env
   # Edit .env with your specific configuration
   ```

2. **Start the production environment:**
   ```bash
   npm run docker:up
   ```

3. **Access the services:**
   - MCP Server: http://localhost:3000
   - Neo4j Browser: http://localhost:7474
   - Neo4j credentials: `neo4j/password2`

## Available Docker Commands

### Basic Commands
```bash
# Start all services (production)
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Build images
npm run docker:build

# Rebuild images from scratch
npm run docker:rebuild
```

### Development Commands
```bash
# Start development environment (includes hot reload)
npm run docker:dev

# Stop development environment
npm run docker:dev:down
```

### Advanced Commands
```bash
# Start with Redis caching
npm run docker:cache

# Start everything (dev + cache)
npm run docker:full

# Clean up containers and volumes
npm run docker:clean

# Complete reset (rebuild everything)
npm run docker:reset
```

## Services Overview

### Neo4j Database
- **Image**: `neo4j:5-community`
- **Ports**: 7474 (HTTP), 7687 (Bolt)
- **Volumes**: Persistent data storage
- **Features**: APOC plugin enabled

### MCP Server (Production)
- **Port**: 3000
- **Features**: 
  - Multi-stage build for optimization
  - Non-root user for security
  - Health checks
  - Automatic restart

### MCP Server (Development)
- **Port**: 3001
- **Features**:
  - Hot reload with volume mounting
  - Full source code access
  - Development dependencies

### Redis (Optional)
- **Port**: 6379
- **Profile**: `cache`
- **Features**: Persistent storage with AOF

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Required
NEO4J_URI=bolt://neo4j:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password2

# API Keys (add your keys)
OPENAI_API_KEY=your_key_here
GROK_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here
```

## Profiles

The docker-compose setup uses profiles for optional services:

- **Default**: Neo4j + MCP Server (production)
- **dev**: Adds development MCP server
- **cache**: Adds Redis caching

## Health Checks

All services include health checks:
- Neo4j: HTTP endpoint check
- MCP Server: Node.js health check
- Automatic restart on failure

## Volumes

Persistent storage for:
- `neo4j_data`: Database data
- `neo4j_logs`: Database logs
- `neo4j_import`: Import directory
- `redis_data`: Redis data (if using cache profile)
- `./logs`: Application logs
- `./backups`: Database backups

## Networking

All services run on the `deepresearch-network` bridge network for secure inter-container communication.

## Security Features

- Non-root user in containers
- Network isolation
- Environment variable configuration
- Health monitoring
- Automatic restarts

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change ports in docker-compose.yml if needed
2. **Permission issues**: Ensure proper file ownership for volumes
3. **Memory issues**: Adjust Neo4j memory settings in docker-compose.yml

### Logs and Debugging

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f mcp-server
docker-compose logs -f neo4j

# Execute commands in running containers
docker-compose exec mcp-server sh
docker-compose exec neo4j bash
```

### Database Connection

If the MCP server can't connect to Neo4j:
1. Check if Neo4j is healthy: `docker-compose ps`
2. Verify network connectivity: `docker-compose exec mcp-server ping neo4j`
3. Check environment variables in the container

## Production Deployment

For production deployment:

1. **Change default passwords** in docker-compose.yml
2. **Configure proper API keys** in .env
3. **Set up proper logging** and monitoring
4. **Configure backups** for Neo4j data
5. **Use secrets management** for sensitive data
6. **Set resource limits** in docker-compose.yml

## Development Workflow

1. Start development environment:
   ```bash
   npm run docker:dev
   ```

2. Make code changes (auto-reload enabled)

3. Test your changes at http://localhost:3001

4. Build and test production:
   ```bash
   npm run docker:rebuild
   npm run docker:up
   ```

## Backup and Restore

Database backups are mounted to `./backups` directory:

```bash
# Create backup
docker-compose exec neo4j neo4j-admin database dump neo4j --to-path=/backups

# Restore backup
docker-compose exec neo4j neo4j-admin database load neo4j --from-path=/backups
```