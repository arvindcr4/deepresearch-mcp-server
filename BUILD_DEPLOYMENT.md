# Build, Versioning, and Publishing Guide

This document covers the complete build, versioning, and publishing process for the DeepResearch MCP Server.

## ✅ Completed Setup

### 1. Build Process
- **Build Command**: `npm run build`
- **Output**: `dist/` directory with compiled TypeScript
- **Shebang**: Automatically fixed via `scripts/make-executable.ts`
- **Executable**: `dist/index.js` is made executable during build

### 2. Package Configuration
- **Package Files**: Only essential files included (see `.npmignore`)
- **Binary**: CLI executable configured as `deepresearch-mcp`
- **Repository**: GitHub repository URLs configured
- **Version Management**: Standard semantic versioning

### 3. Docker Support
- **Dockerfile**: Node.js 22 Alpine-based image
- **Security**: Non-root user, minimal attack surface
- **Size**: ~150MB optimized container
- **Documentation**: Complete Docker deployment guide

## 🚀 Publishing Options

### NPM Registry
```bash
# Interactive publishing script
npm run publish:npm

# Direct publishing (after build)
npm publish --access public
```

### GitHub Releases
```bash
# Create GitHub release with assets
npm run release:github
```

### Docker
```bash
# Build Docker image
npm run docker:build
npm run docker:build:version

# Run container
docker run -p 3000:3000 deepresearch-mcp-server:latest http-server
```

## 📋 Publishing Checklist

### Pre-publish Verification
- [ ] `npm run build` completes successfully
- [ ] `dist/index.js` is executable (`ls -la dist/index.js`)
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Package builds correctly (`npm pack --dry-run`)

### Version Management
- [ ] Update `CHANGELOG.md` with changes
- [ ] Bump version using `npm version patch|minor|major`
- [ ] Commit and tag version changes
- [ ] Push tags to repository

### Publishing Steps
1. **NPM Registry**:
   ```bash
   npm run publish:npm
   ```

2. **GitHub Releases**:
   ```bash
   npm run release:github
   ```

3. **Docker Hub** (manual):
   ```bash
   docker build -t username/deepresearch-mcp-server:latest .
   docker push username/deepresearch-mcp-server:latest
   ```

## 📦 Package Contents

The published package includes:
- `dist/` - Compiled JavaScript and type definitions
- `README.md` - Main documentation
- `CHANGELOG.md` - Version history
- `LICENSE` - Apache 2.0 license
- `.env.example` - Environment configuration template

## 🔧 Scripts Reference

### Build Scripts
```bash
npm run build              # Full build with executable permissions
npm run rebuild            # Clean build
```

### Publishing Scripts
```bash
npm run publish:npm        # Interactive NPM publishing
npm run release:github     # Create GitHub release
npm run prepublishOnly     # Pre-publish validation (auto-run)
```

### Docker Scripts
```bash
npm run docker:build       # Build latest image
npm run docker:build:version # Build versioned image
```

### Development Scripts
```bash
npm run dev                # TypeScript watch mode
npm run start              # Run built server
npm run test               # Run test suite
npm run lint               # Code linting
```

## 🔐 Security Features

### Package Security
- Only built files included (no source code)
- No sensitive configuration in package
- Environment variables properly documented

### Docker Security
- Non-root user execution
- Minimal Alpine Linux base
- Proper signal handling with `dumb-init`
- No secrets in image layers

## 🌐 Deployment Options

### 1. NPM Package Installation
```bash
npm install -g deepresearch-mcp-server
deepresearch-mcp --help
```

### 2. Docker Container
```bash
docker run -p 3000:3000 deepresearch-mcp-server:latest http-server
```

### 3. Source Installation
```bash
git clone https://github.com/cyanheads/deepresearch-mcp-server.git
cd deepresearch-mcp-server
npm install
npm run build
npm start
```

## 📊 Package Stats

- **Package Size**: ~213 KB compressed
- **Unpacked Size**: ~1.2 MB
- **Files**: 261 files
- **Dependencies**: Production dependencies only

## 🔄 Continuous Integration

The package includes several automated checks:
- **Pre-commit**: Linting and formatting
- **Pre-publish**: Build, test, and lint validation
- **Version Control**: Automatic tagging and changelog

## 📚 Documentation

Additional documentation available:
- `README.md` - Main project documentation
- `DOCKER.md` - Docker deployment guide
- `CONFIG.md` - Configuration reference
- `SECURITY.md` - Security considerations

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check TypeScript compilation errors
   - Verify all dependencies are installed
   - Ensure Node.js version compatibility

2. **Publishing Errors**:
   - Verify npm authentication: `npm whoami`
   - Check package name availability
   - Ensure version number is incremented

3. **Docker Issues**:
   - Verify Docker daemon is running
   - Check Dockerfile syntax
   - Ensure proper file permissions

### Support

For issues and questions:
- GitHub Issues: [Project Issues](https://github.com/cyanheads/deepresearch-mcp-server/issues)
- Documentation: Project README and guides
- Community: Project discussions on GitHub
