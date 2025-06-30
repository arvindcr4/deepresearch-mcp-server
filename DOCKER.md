# Docker Deployment Guide

This guide covers containerized deployment of the DeepResearch MCP Server using Docker.

## Quick Start

### Building the Docker Image

```bash
# Build latest version
npm run docker:build

# Build with version tag
npm run docker:build:version
```

### Running the Container

```bash
# Basic run (MCP stdio mode)
docker run --rm deepresearch-mcp-server:latest

# HTTP server mode
docker run --rm -p 3000:3000 deepresearch-mcp-server:latest http-server

# With environment variables
docker run --rm -p 3000:3000 \
  -e NEO4J_URI=bolt://neo4j:7687 \
  -e NEO4J_USERNAME=neo4j \
  -e NEO4J_PASSWORD=password \
  deepresearch-mcp-server:latest http-server

# With persistent logs and backups
docker run --rm -p 3000:3000 \
  -v $(pwd)/logs:/usr/src/app/logs \
  -v $(pwd)/backups:/usr/src/app/backups \
  deepresearch-mcp-server:latest http-server
```

## Docker Compose

Use the included `docker-compose.yml` for a complete stack with Neo4j:

```bash
# Start services
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

## Image Details

- **Base Image**: `node:22-alpine`
- **Size**: ~150MB (minimal Alpine Linux)
- **User**: Non-root user `mcpserver` (UID 1001)
- **Port**: 3000 (HTTP server mode)
- **Working Directory**: `/usr/src/app`

## Environment Variables

The container respects all environment variables documented in the main README:

- `NEO4J_URI` - Neo4j connection string
- `NEO4J_USERNAME` - Neo4j username
- `NEO4J_PASSWORD` - Neo4j password
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `PORT` - HTTP server port (default: 3000)

## Volume Mounts

### Recommended Volumes

```bash
docker run --rm -p 3000:3000 \
  -v /host/logs:/usr/src/app/logs \
  -v /host/backups:/usr/src/app/backups \
  -v /host/atlas-backups:/usr/src/app/atlas-backups \
  deepresearch-mcp-server:latest
```

### Configuration Override

```bash
# Mount custom .env file
docker run --rm -p 3000:3000 \
  -v /host/.env:/usr/src/app/.env:ro \
  deepresearch-mcp-server:latest
```

## Security Features

- Runs as non-root user (`mcpserver`)
- Minimal Alpine Linux base image
- No sensitive data in image layers
- Proper signal handling with `dumb-init`

## Health Checks

The container includes a basic health check:

```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

## Production Considerations

### Resource Limits

```bash
docker run --rm -p 3000:3000 \
  --memory=512m \
  --cpus=1 \
  deepresearch-mcp-server:latest
```

### Logging

```bash
# Configure log driver
docker run --rm -p 3000:3000 \
  --log-driver=json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  deepresearch-mcp-server:latest
```

### Networking

```bash
# Create custom network
docker network create mcp-network

# Run with custom network
docker run --rm -p 3000:3000 \
  --network=mcp-network \
  --name=mcp-server \
  deepresearch-mcp-server:latest
```

## Kubernetes Deployment

Example Kubernetes deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deepresearch-mcp-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: deepresearch-mcp-server
  template:
    metadata:
      labels:
        app: deepresearch-mcp-server
    spec:
      containers:
      - name: mcp-server
        image: deepresearch-mcp-server:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NEO4J_URI
          value: "bolt://neo4j-service:7687"
        - name: LOG_LEVEL
          value: "info"
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: mcp-server-service
spec:
  selector:
    app: deepresearch-mcp-server
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Troubleshooting

### Common Issues

1. **Permission denied**: Ensure proper volume permissions
   ```bash
   sudo chown -R 1001:1001 ./logs ./backups
   ```

2. **Neo4j connection issues**: Check network connectivity
   ```bash
   docker run --rm --network=host deepresearch-mcp-server:latest
   ```

3. **Memory issues**: Increase container limits
   ```bash
   docker run --rm --memory=1g deepresearch-mcp-server:latest
   ```

### Debug Mode

```bash
# Enable debug logging
docker run --rm -p 3000:3000 \
  -e LOG_LEVEL=debug \
  deepresearch-mcp-server:latest http-server
```

### Container Shell Access

```bash
# Get shell in running container
docker exec -it <container-name> sh

# Run with shell override
docker run --rm -it --entrypoint=sh deepresearch-mcp-server:latest
```
