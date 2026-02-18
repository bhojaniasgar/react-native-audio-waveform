# GitHub Actions Workflows Summary

This repository uses GitHub Actions for automated CI/CD. Below is a summary of all workflows.

## Workflows

### 1. PR Checks (`pr-checks.yml`)

**Purpose:** Validate code quality and build integrity on every pull request and push.

**Triggers:**
- Pull requests to `main`, `master`, or `develop`
- Pushes to `main`, `master`, or `develop`

**Jobs:**
- **Lint and Build** - Runs ESLint and TypeScript compilation
- **Test** - Runs Jest tests
- **Android Build Check** - Validates Android build configuration
- **iOS Build Check** - Validates iOS/Podspec configuration

**Status:** ![PR Checks](https://github.com/bhojaniasgar/react-native-audio-waveform/actions/workflows/pr-checks.yml/badge.svg)

---

### 2. Release (`release.yml`)

**Purpose:** Automate the release process including GitHub releases and NPM publishing.

**Triggers:**
- Push of version tags matching `v*` pattern (e.g., `v1.0.5`)

**Jobs:**
- Build the package
- Extract changelog for the version
- Create GitHub release with changelog
- Publish package to NPM

**Required Secrets:**
- `NPM_TOKEN` - NPM authentication token

**Status:** ![Release](https://github.com/bhojaniasgar/react-native-audio-waveform/actions/workflows/release.yml/badge.svg)

---

### 3. Deploy to GitHub Pages (`deploy-pages.yml`)

**Purpose:** Deploy documentation website to GitHub Pages.

**Triggers:**
- Push to `main` or `master` branch
- Manual workflow dispatch

**Jobs:**
- Build documentation site
- Deploy to GitHub Pages

**Required Secrets:**
- None (uses built-in GITHUB_TOKEN)

**Required Setup:**
- Enable GitHub Pages in repository settings with source set to "GitHub Actions"

**Status:** ![GitHub Pages](https://github.com/bhojaniasgar/react-native-audio-waveform/actions/workflows/deploy-pages.yml/badge.svg)

**Live Site:** https://bhojaniasgar.github.io/react-native-audio-waveform/

---

## Workflow Files Location

All workflow files are located in `.github/workflows/`:

```
.github/
└── workflows/
    ├── pr-checks.yml
    ├── release.yml
    └── deploy-pages.yml
```

## Monitoring Workflows

View all workflow runs at:
https://github.com/bhojaniasgar/react-native-audio-waveform/actions

## Configuration

See [SETUP.md](SETUP.md) for instructions on configuring required secrets.

## Troubleshooting

See [RELEASE.md](RELEASE.md) for troubleshooting common issues.
