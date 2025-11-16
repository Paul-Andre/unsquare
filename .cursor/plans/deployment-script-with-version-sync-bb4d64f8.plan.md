<!-- bb4d64f8-479c-40ac-909a-19fa252f7c5e ea838cb8-5bad-431a-8b76-adab7a0c7ef7 -->
# Deployment Script with Version Synchronization

## Overview

Create a bash script (`deploy.sh`) that automates the deployment process by:

1. Copying all files from `web/www` to `~/Programming/unflip_deploy`
2. Synchronizing version numbers between the two repositories
3. Updating `release_log.txt` with new version entry
4. Committing changes in both repos with version number
5. Pushing to GitHub

## Implementation Details

### Script Location

- Create `deploy.sh` in the project root (`/home/paul/Programming/unsquare/`)

### Key Features

1. **Version Management**

- Read current version from git log (search for "Release v" in commit messages, use most recent)
- Accept optional version number as command-line argument (e.g., `./deploy.sh 0.7.5`)
- If no version specified, auto-increment patch version (e.g., 0.7.4 → 0.7.5) and echo it
- Simple `read` prompt for release notes (one line is fine)
- Update version in both repos' `manifest.json` files (add `version` field if missing)
- Append new entry to `web/www/release_log.txt` with format: `DATE\nVERSION\nRELEASE_NOTES\n` (use simple date format like `date +"%d %b %Y"`)

2. **File Copying**

- Use `rsync` or `cp -r` to copy all files from `web/www/` to `~/Programming/unflip_deploy/`
- Preserve file permissions and structure
- Exclude `.git` directory from copy

3. **Git Operations**

- Check for uncommitted changes in both repos - abort if found (keep it simple)
- Commit changes in source repo with message: `Release v{VERSION}`
- Commit changes in deploy repo with same message
- Push both repos to their remotes (source: `origin/master`, deploy: `origin/gh-pages`)

4. **Error Handling**

- Basic checks: verify deploy directory exists, check git status
- Simple validation: ensure version matches pattern (X.Y.Z)
- Exit on errors with clear messages (no complex error recovery)

### Files to Modify/Create

- **New**: `deploy.sh` - Main deployment script
- **Modified**: `web/www/manifest.json` - Add/update version field
- **Modified**: `web/www/release_log.txt` - Append new version entry
- **Modified**: `~/Programming/unflip_deploy/manifest.json` - Sync version field

### Script Flow

1. Parse current version from `release_log.txt`
2. Prompt for new version and release notes
3. Update `release_log.txt` in source repo
4. Update `manifest.json` in source repo
5. Copy all files to deploy directory
6. Update `manifest.json` in deploy repo
7. Commit in source repo
8. Commit in deploy repo
9. Push both repos