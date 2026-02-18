#!/bin/bash

# Release script for react-native-audio-waveform
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if version type is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Version type not specified${NC}"
    echo "Usage: ./scripts/release.sh [patch|minor|major]"
    exit 1
fi

VERSION_TYPE=$1

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}Error: Invalid version type. Use patch, minor, or major${NC}"
    exit 1
fi

echo -e "${YELLOW}Starting release process...${NC}"

# Check if working directory is clean
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}Error: Working directory is not clean. Commit or stash changes first.${NC}"
    exit 1
fi

# Ensure we're on main/master branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ ! "$CURRENT_BRANCH" =~ ^(main|master)$ ]]; then
    echo -e "${YELLOW}Warning: You're not on main/master branch. Current branch: $CURRENT_BRANCH${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Pull latest changes
echo -e "${YELLOW}Pulling latest changes...${NC}"
git pull origin $CURRENT_BRANCH

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
npm test -- --passWithNoTests

# Run linter
echo -e "${YELLOW}Running linter...${NC}"
npm run lint

# Build
echo -e "${YELLOW}Building package...${NC}"
npm run build

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}Current version: $CURRENT_VERSION${NC}"

# Bump version
echo -e "${YELLOW}Bumping version ($VERSION_TYPE)...${NC}"
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}New version: $NEW_VERSION${NC}"

# Update CHANGELOG
echo -e "${YELLOW}Please update CHANGELOG.md with changes for version $NEW_VERSION${NC}"
echo -e "${YELLOW}Press enter when done...${NC}"
read

# Commit changes
echo -e "${YELLOW}Committing changes...${NC}"
git add package.json CHANGELOG.md
git commit -m "chore: bump version to $NEW_VERSION"

# Create tag
echo -e "${YELLOW}Creating tag v$NEW_VERSION...${NC}"
git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"

# Push changes
echo -e "${YELLOW}Pushing changes and tag...${NC}"
git push origin $CURRENT_BRANCH
git push origin "v$NEW_VERSION"

echo -e "${GREEN}✓ Release process completed!${NC}"
echo -e "${GREEN}Version $NEW_VERSION has been released.${NC}"
echo -e "${YELLOW}GitHub Actions will now:${NC}"
echo -e "  - Create a GitHub release"
echo -e "  - Publish to NPM"
echo -e "  - Deploy documentation to Netlify"
echo -e "${YELLOW}Monitor progress at: https://github.com/bhojaniasgar/react-native-audio-waveform/actions${NC}"
