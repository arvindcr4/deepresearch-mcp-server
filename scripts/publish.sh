#!/bin/bash

# NPM Publishing Script for DeepResearch MCP Server
# Handles versioning, building, and publishing to npm registry

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

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_error "Working directory is not clean. Please commit your changes first."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_status "Current version: $CURRENT_VERSION"

# Ask for version bump type
echo ""
echo "Select version bump type:"
echo "1) patch (bug fixes)"
echo "2) minor (new features)"
echo "3) major (breaking changes)"
echo "4) custom version"
echo "5) skip version bump"
read -p "Enter choice (1-5): " choice

case $choice in
    1)
        VERSION_TYPE="patch"
        ;;
    2)
        VERSION_TYPE="minor"
        ;;
    3)
        VERSION_TYPE="major"
        ;;
    4)
        read -p "Enter custom version: " CUSTOM_VERSION
        VERSION_TYPE=$CUSTOM_VERSION
        ;;
    5)
        print_status "Skipping version bump"
        VERSION_TYPE=""
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# Bump version if requested
if [ ! -z "$VERSION_TYPE" ]; then
    print_header "Bumping Version"
    if [[ "$VERSION_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+.*$ ]]; then
        # Custom version
        npm version $VERSION_TYPE --no-git-tag-version
        NEW_VERSION=$VERSION_TYPE
    else
        # Standard bump
        NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
        NEW_VERSION=${NEW_VERSION#v} # Remove 'v' prefix
    fi
    print_status "Version bumped to: $NEW_VERSION"
else
    NEW_VERSION=$CURRENT_VERSION
fi

# Run pre-publish checks
print_header "Running Pre-publish Checks"

print_status "Running tests..."
if ! npm test; then
    print_error "Tests failed"
    exit 1
fi

print_status "Running linter..."
if ! npm run lint; then
    print_error "Linting failed"
    exit 1
fi

# Clean build
print_header "Building Package"
print_status "Cleaning previous build..."
rm -rf dist/

print_status "Building..."
if ! npm run build; then
    print_error "Build failed"
    exit 1
fi

# Verify build output
if [ ! -f "dist/index.js" ]; then
    print_error "Build output missing: dist/index.js"
    exit 1
fi

print_status "Build completed successfully"

# Check if executable bit is set
if [ ! -x "dist/index.js" ]; then
    print_error "dist/index.js is not executable"
    exit 1
fi

print_status "Executable permissions verified"

# Ask for publishing destination
echo ""
echo "Select publishing destination:"
echo "1) npm public registry"
echo "2) npm private registry"
echo "3) GitHub Packages"
echo "4) Dry run (test package creation)"
read -p "Enter choice (1-4): " pub_choice

case $pub_choice in
    1)
        REGISTRY=""
        ACCESS="--access public"
        ;;
    2)
        read -p "Enter private registry URL: " PRIVATE_REGISTRY
        REGISTRY="--registry $PRIVATE_REGISTRY"
        ACCESS=""
        ;;
    3)
        REGISTRY="--registry https://npm.pkg.github.com"
        ACCESS=""
        ;;
    4)
        print_header "Dry Run"
        print_status "Creating package tarball..."
        npm pack
        TARBALL="deepresearch-mcp-server-${NEW_VERSION}.tgz"
        if [ -f "$TARBALL" ]; then
            print_status "Package created: $TARBALL"
            print_status "Contents:"
            tar -tzf "$TARBALL" | head -20
            if [ $(tar -tzf "$TARBALL" | wc -l) -gt 20 ]; then
                echo "... and $(( $(tar -tzf "$TARBALL" | wc -l) - 20 )) more files"
            fi
            rm "$TARBALL"
        fi
        print_status "Dry run completed successfully"
        exit 0
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# Final confirmation
print_header "Final Confirmation"
print_status "Package: deepresearch-mcp-server@$NEW_VERSION"
print_status "Registry: ${REGISTRY:-npm public registry}"
print_warning "This will publish the package publicly!"

read -p "Are you sure you want to publish? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    print_status "Publishing cancelled"
    exit 0
fi

# Publish
print_header "Publishing Package"
print_status "Publishing to registry..."

if npm publish $REGISTRY $ACCESS; then
    print_status "Package published successfully!"
    
    # Commit version bump if we made one
    if [ ! -z "$VERSION_TYPE" ] && [ "$VERSION_TYPE" != "skip" ]; then
        print_status "Committing version bump..."
        git add package.json package-lock.json
        git commit -m "chore: bump version to $NEW_VERSION"
        git tag "v$NEW_VERSION"
        
        print_status "Version $NEW_VERSION committed and tagged"
        print_warning "Don't forget to push: git push && git push --tags"
    fi
    
    print_header "Success!"
    print_status "Package deepresearch-mcp-server@$NEW_VERSION published successfully"
else
    print_error "Publishing failed"
    exit 1
fi
