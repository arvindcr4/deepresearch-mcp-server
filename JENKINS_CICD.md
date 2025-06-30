# Jenkins CI/CD Setup for DeepResearch MCP Server

This document outlines the complete Jenkins CI/CD pipeline setup for the DeepResearch MCP Server project.

## Overview

The Jenkins pipeline provides a comprehensive CI/CD solution with the following features:

- **Automated Testing**: Unit tests, integration tests, and end-to-end tests
- **Quality Gates**: ESLint, TypeScript type checking, SonarQube analysis
- **Security Scanning**: npm audit and dependency vulnerability checks
- **Docker Build & Push**: Multi-stage Docker builds with optimized images
- **Multi-Environment Deployment**: Staging and production deployments
- **Monitoring & Alerting**: Slack notifications and comprehensive logging

## Pipeline Stages

### 1. Checkout
- Retrieves source code from Git repository
- Sets build tags and commit information

### 2. Setup Environment
- Installs Node.js 20
- Starts Neo4j test instance for integration tests
- Creates isolated test network

### 3. Install Dependencies
- Runs `npm ci` for clean dependency installation
- Performs security audit with `npm audit`

### 4. Code Quality & Security
- **Lint**: ESLint analysis with JSON reporting
- **Type Check**: TypeScript compilation validation
- **Security Scan**: npm audit and audit-ci reports

### 5. Build
- TypeScript compilation
- Creates executable files
- Archives build artifacts

### 6. Test
- **Unit Tests**: Jest with coverage reporting
- **Integration Tests**: Tests against live Neo4j instance
- Publishes test results and coverage reports

### 7. SonarQube Analysis (Main/Develop branches)
- Code quality analysis
- Security vulnerability detection
- Technical debt assessment

### 8. Quality Gate
- Enforces quality standards before deployment
- Blocks deployment if quality gate fails

### 9. Docker Build (Main/Develop branches)
- Multi-stage Docker build
- Pushes to Docker registry with multiple tags
- Tags: `latest`, `stable` (main branch), `{branch}-{build}-{commit}`

### 10. Deploy (Main branch only)
- **Staging Deployment**: Automatic deployment to staging
- **Staging Tests**: Smoke tests against staging environment
- **Production Deployment**: Manual approval required
- **Production Health Check**: Post-deployment validation

## Prerequisites

### Jenkins Configuration

1. **Required Plugins**:
   - Pipeline
   - Docker Pipeline
   - SonarQube Scanner
   - Slack Notification
   - HTML Publisher
   - Test Results Analyzer

2. **Credentials Setup**:
   ```bash
   # Add these credentials in Jenkins
   docker-registry          # Docker registry credentials
   sonarqube-token         # SonarQube authentication token
   slack-webhook           # Slack webhook URL
   ```

3. **Global Tools**:
   - Node.js 20
   - SonarQube Scanner
   - Docker

### Environment Variables

Create these environment files:

#### `.env.test`
```bash
NODE_ENV=test
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=testpassword
LOG_LEVEL=error
```

#### `.env.staging`
```bash
NODE_ENV=staging
NEO4J_PASSWORD_STAGING=your_staging_password
```

#### `.env.production`
```bash
NODE_ENV=production
NEO4J_PASSWORD_PROD=your_production_password
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=https://your-domain.com
GRAFANA_ADMIN_PASSWORD=your_grafana_password
GRAFANA_SECRET_KEY=your_grafana_secret
BACKUP_S3_BUCKET=your-backup-bucket
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

## Server Setup

### Staging Server
```bash
# Create directories
sudo mkdir -p /opt/deepresearch-mcp
sudo chown jenkins:jenkins /opt/deepresearch-mcp

# Setup SSH access for Jenkins
sudo -u jenkins ssh-keygen -t rsa -b 4096
# Add public key to staging server's authorized_keys
```

### Production Server
```bash
# Create directories
sudo mkdir -p /opt/deepresearch-mcp
sudo mkdir -p /opt/deepresearch-backups
sudo mkdir -p /opt/neo4j-data
sudo mkdir -p /opt/neo4j-backups

# Set permissions
sudo chown -R jenkins:jenkins /opt/deepresearch-mcp
sudo chown -R 7474:7474 /opt/neo4j-data
sudo chown -R 7474:7474 /opt/neo4j-backups
```

## Testing Configuration

### Unit Tests
- Framework: Jest with ts-jest
- Coverage: 70% threshold across all metrics
- Location: `src/**/__tests__/**/*.test.ts`

### Integration Tests
- Tests complete workflows with Neo4j
- Uses test containers for isolation
- Location: `src/**/*.integration.test.ts`

### E2E Tests
- Tests complete user workflows
- Runs against deployed environments
- Location: `e2e/**/*.e2e.test.ts`

### Smoke Tests
- Quick production health checks
- Validates critical functionality
- Location: `smoke/**/*.smoke.test.ts`

## Docker Configuration

### Multi-stage Build
1. **Builder Stage**: Compiles TypeScript and installs dependencies
2. **Runtime Stage**: Minimal production image with security hardening

### Security Features
- Non-root user execution
- Minimal base image (Alpine Linux)
- Health checks included
- Resource limits configured

## Monitoring & Observability

### Production Monitoring Stack
- **Prometheus**: Metrics collection
- **Grafana**: Visualization and alerting
- **Loki**: Log aggregation
- **Promtail**: Log shipping

### Available Metrics
- Application performance metrics
- Neo4j database metrics
- Container resource usage
- Business metrics (requests, errors, etc.)

## Deployment Strategies

### Staging Deployment
- Automatic deployment on main branch
- Database migrations run automatically
- Smoke tests validate deployment

### Production Deployment
- Manual approval gate
- Blue-green deployment support
- Automated rollback on health check failure
- Database backup before deployment

## Troubleshooting

### Common Issues

1. **Neo4j Connection Failures**:
   ```bash
   # Check Neo4j container status
   docker ps | grep neo4j
   
   # Check logs
   docker logs neo4j-test
   ```

2. **Docker Build Failures**:
   ```bash
   # Check Docker daemon
   systemctl status docker
   
   # Clean build cache
   docker system prune -f
   ```

3. **Test Failures**:
   ```bash
   # Run tests locally
   npm test
   
   # Run with verbose output
   npm test -- --verbose
   ```

4. **SonarQube Issues**:
   ```bash
   # Check SonarQube server status
   curl -u admin:admin http://sonarqube:9000/api/system/status
   ```

### Pipeline Debugging

1. **Enable Debug Logging**:
   ```groovy
   // Add to Jenkinsfile
   environment {
       DEBUG = 'true'
   }
   ```

2. **Manual Testing**:
   ```bash
   # Test Docker build locally
   docker build -t test-image .
   
   # Test application startup
   docker run --rm -p 3000:3000 test-image
   ```

## Security Considerations

### Secrets Management
- All secrets stored in Jenkins credentials store
- Environment-specific secret separation
- Regular secret rotation recommended

### Network Security
- Isolated Docker networks per environment
- No direct database access from external networks
- TLS encryption for all external communications

### Access Control
- Jenkins role-based access control
- Deployment approvals required for production
- Audit logging enabled

## Performance Optimization

### Build Optimization
- Multi-stage Docker builds reduce image size
- npm ci for faster dependency installation
- Parallel test execution where possible

### Deployment Optimization
- Health checks prevent traffic to unhealthy instances
- Resource limits prevent resource contention
- Database connection pooling configured

## Maintenance Tasks

### Regular Tasks
- Weekly security updates
- Monthly backup verification
- Quarterly disaster recovery testing

### Monitoring Tasks
- Daily build status review
- Weekly performance metrics review
- Monthly capacity planning review

## Support

For issues with the Jenkins CI/CD pipeline:

1. Check Jenkins build logs
2. Review application logs in Grafana
3. Consult troubleshooting section above
4. Contact DevOps team for infrastructure issues

## Version History

- v1.0.0: Initial Jenkins CI/CD implementation
- Supports: Node.js 20, Neo4j 5, Docker multi-stage builds
- Features: Complete testing pipeline, multi-environment deployment, monitoring