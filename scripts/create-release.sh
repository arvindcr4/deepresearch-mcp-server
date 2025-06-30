#!/bin/bash

# GitHub Release Creation Script for DeepResearch MCP Server
# Creates GitHub releases with built artifacts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is not installed"
    print_status "Install it with: brew install gh"
    exit 1
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
    print_error "Not authenticated with GitHub"
    print_status "Run: gh auth login"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository"
    exit 1
fi

# Get current version and tag
CURRENT_VERSION=$(node -p "require('./package.json').version")
TAG_NAME="v$CURRENT_VERSION"

print_status "Current version: $CURRENT_VERSION"
print_status "Tag name: $TAG_NAME"

# Check if tag already exists
if git tag -l | grep -q "^$TAG_NAME$"; then
    print_warning "Tag $TAG_NAME already exists"
    read -p "Do you want to continue with existing tag? (y/N): " continue_existing
    if [[ ! $continue_existing =~ ^[Yy]$ ]]; then
        print_status "Cancelled"
        exit 0
    fi
else
    # Create tag if it doesn't exist
    print_status "Creating tag $TAG_NAME"
    git tag "$TAG_NAME"
    git push origin "$TAG_NAME"
fi

# Build the project
print_header "Building Package"
print_status "Cleaning previous build..."
rm -rf dist/

print_status "Building..."
if ! npm run build; then
    print_error "Build failed"
    exit 1
fi

print_status "Build completed successfully"

# Create release assets
print_header "Creating Release Assets"
RELEASE_DIR="release-assets"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# Create tarball of built package
print_status "Creating package tarball..."
npm pack
TARBALL="deepresearch-mcp-server-${CURRENT_VERSION}.tgz"
mv "$TARBALL" "$RELEASE_DIR/"

# Create source code archive
print_status "Creating source archive..."
git archive --format=zip --prefix="deepresearch-mcp-server-$CURRENT_VERSION/" HEAD > "$RELEASE_DIR/deepresearch-mcp-server-$CURRENT_VERSION-source.zip"

# Create Docker build context
print_status "Creating Docker build context..."
DOCKER_CONTEXT="$RELEASE_DIR/deepresearch-mcp-docker-$CURRENT_VERSION.tar.gz"
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    --exclude='backups' \
    --exclude='atlas-backups' \
    --exclude='coverage' \
    --exclude='.nyc_output' \
    --exclude='src' \
    --exclude='__tests__' \
    --exclude='scripts' \
    --exclude='docs' \
    --exclude='examples' \
    -czf "$DOCKER_CONTEXT" \
    dist/ package.json package-lock.json Dockerfile .dockerignore .env.example README.md LICENSE

print_status "Release assets created in $RELEASE_DIR/"
ls -la "$RELEASE_DIR/"

# Generate release notes
print_header "Generating Release Notes"
RELEASE_NOTES_FILE="$RELEASE_DIR/release-notes.md"

# Get commits since last tag
LAST_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
if [ -z "$LAST_TAG" ]; then
    COMMIT_RANGE="HEAD"
    print_status "No previous tags found, using all commits"
else
    COMMIT_RANGE="$LAST_TAG..HEAD"
    print_status "Getting commits since: $LAST_TAG"
fi

# Generate release notes
cat > "$RELEASE_NOTES_FILE" << EOF
# DeepResearch MCP Server v$CURRENT_VERSION

## 🚀 Release Highlights

This release includes improvements and updates to the DeepResearch MCP Server.

## 📦 Assets

- **\`deepresearch-mcp-server-${CURRENT_VERSION}.tgz\`** - NPM package ready for installation
- **\`deepresearch-mcp-server-${CURRENT_VERSION}-source.zip\`** - Source code archive
- **\`deepresearch-mcp-docker-${CURRENT_VERSION}.tar.gz\`** - Docker build context

## 🐳 Docker Usage

\`\`\`bash
# Extract Docker context
tar -xzf deepresearch-mcp-docker-${CURRENT_VERSION}.tar.gz
cd deepresearch-mcp-server/

# Build Docker image
docker build -t deepresearch-mcp-server:${CURRENT_VERSION} .

# Run container
docker run -p 3000:3000 deepresearch-mcp-server:${CURRENT_VERSION}
\`\`\`

## 📋 Changes

EOF

# Add commit messages
git log --oneline --no-merges $COMMIT_RANGE >> "$RELEASE_NOTES_FILE"

print_status "Release notes generated: $RELEASE_NOTES_FILE"

# Ask for release type
echo ""
echo "Select release type:"
echo "1) Latest release (recommended)"
echo "2) Pre-release"
echo "3) Draft release"
read -p "Enter choice (1-3): " release_type

case $release_type in
    1)
        RELEASE_FLAGS=""
        ;;
    2)
        RELEASE_FLAGS="--prerelease"
        ;;
    3)
        RELEASE_FLAGS="--draft"
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# Create the release
print_header "Creating GitHub Release"
print_status "Creating release $TAG_NAME"

RELEASE_CMD="gh release create $TAG_NAME \
    $RELEASE_DIR/*.tgz \
    $RELEASE_DIR/*.zip \
    $RELEASE_DIR/*.tar.gz \
    --title \"DeepResearch MCP Server v$CURRENT_VERSION\" \
    --notes-file \"$RELEASE_NOTES_FILE\" \
    $RELEASE_FLAGS"

if eval $RELEASE_CMD; then
    print_header "Success!"
    print_status "Release created successfully: $TAG_NAME"
    print_status "View release: $(gh repo view --web)/releases/tag/$TAG_NAME"
    
    # Clean up
    rm -rf "$RELEASE_DIR"
    print_status "Release assets cleaned up"
else
    print_error "Failed to create release"
    print_status "Release assets preserved in: $RELEASE_DIR"
    exit 1
fi
