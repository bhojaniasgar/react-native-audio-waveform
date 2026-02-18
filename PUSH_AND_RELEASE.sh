#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           REACT NATIVE AUDIO WAVEFORM v1.0.5 RELEASE                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    echo -e "${RED}❌ Error: You must be on main or master branch${NC}"
    echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ On $CURRENT_BRANCH branch${NC}"
echo ""

# Step 2: Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}📝 Uncommitted changes found. Committing...${NC}"
    git add .
    git commit -m "chore: setup CI/CD and prepare v1.0.5

- Fixed @tsconfig/react-native version typo
- Added @react-native/babel-preset dependency
- Fixed linting and formatting issues
- Switched to npm for all workflows
- Updated AudioWaveformModule.kt for RN compatibility
- Added comprehensive CI/CD with GitHub Pages
- Created beautiful documentation website
- Added MIT license"
    echo -e "${GREEN}✅ Changes committed${NC}"
else
    echo -e "${GREEN}✅ No uncommitted changes${NC}"
fi
echo ""

# Step 3: Push to main
echo -e "${YELLOW}🚀 Pushing to $CURRENT_BRANCH...${NC}"
git push origin $CURRENT_BRANCH
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Pushed to $CURRENT_BRANCH${NC}"
else
    echo -e "${RED}❌ Failed to push to $CURRENT_BRANCH${NC}"
    exit 1
fi
echo ""

# Step 4: Check if tag exists
if git rev-parse v1.0.5 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Tag v1.0.5 already exists locally${NC}"
    echo -e "${YELLOW}Deleting local tag...${NC}"
    git tag -d v1.0.5
fi

# Step 5: Create tag
echo -e "${YELLOW}🏷️  Creating tag v1.0.5...${NC}"
git tag -a v1.0.5 -m "Release v1.0.5

Fixes:
- Fixed compatibility with latest React Native versions (0.76+)
- Updated currentActivity references for proper context handling
- Resolved deprecation warnings in Android module
- Fixed linting and formatting issues
- Added comprehensive CI/CD pipeline"

echo -e "${GREEN}✅ Tag created${NC}"
echo ""

# Step 6: Push tag
echo -e "${YELLOW}🚀 Pushing tag v1.0.5...${NC}"
git push origin v1.0.5 --force
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Tag pushed${NC}"
else
    echo -e "${RED}❌ Failed to push tag${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    RELEASE INITIATED! 🎉                             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✅ Code pushed to $CURRENT_BRANCH${NC}"
echo -e "${GREEN}✅ Tag v1.0.5 pushed${NC}"
echo ""

echo -e "${YELLOW}⏳ Workflows are now running...${NC}"
echo ""

echo -e "${BLUE}Monitor progress at:${NC}"
echo -e "${BLUE}https://github.com/bhojaniasgar/react-native-audio-waveform/actions${NC}"
echo ""

echo -e "${YELLOW}Expected workflows:${NC}"
echo -e "  1. PR Checks (lint, build, test)"
echo -e "  2. Deploy to GitHub Pages"
echo -e "  3. Release (GitHub release + NPM publish)"
echo ""

echo -e "${YELLOW}After completion, verify:${NC}"
echo -e "  📦 NPM: https://www.npmjs.com/package/@bhojaniasgar/react-native-audio-waveform"
echo -e "  🏷️  Release: https://github.com/bhojaniasgar/react-native-audio-waveform/releases"
echo -e "  🌐 Docs: https://bhojaniasgar.github.io/react-native-audio-waveform/"
echo ""

echo -e "${GREEN}Done! Wait 3-5 minutes for workflows to complete.${NC}"
