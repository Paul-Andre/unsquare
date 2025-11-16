#!/bin/bash

set -e

# Handle Ctrl+C gracefully
trap 'echo -e "\n\nDeployment cancelled."; exit 130' INT

SOURCE_DIR="web/www"
DEPLOY_DIR="$HOME/Programming/unflip_deploy"
RELEASE_LOG="$SOURCE_DIR/release_log.txt"

# Check if deploy directory exists
if [ ! -d "$DEPLOY_DIR" ]; then
    echo "Error: Deploy directory $DEPLOY_DIR does not exist"
    exit 1
fi

# Check for uncommitted changes in source repo
if ! git diff-index --quiet HEAD --; then
    echo "Error: Uncommitted changes in source repo. Please commit or stash them first."
    exit 1
fi

# Check for uncommitted changes in deploy repo
cd "$DEPLOY_DIR"
if ! git diff-index --quiet HEAD --; then
    echo "Error: Uncommitted changes in deploy repo. Please commit or stash them first."
    exit 1
fi
cd - > /dev/null

# Get current version from git log (look for version pattern in commit messages)
CURRENT_VERSION=$(git log --oneline | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)

# Fallback to release_log.txt if git log doesn't have version
if [ -z "$CURRENT_VERSION" ]; then
    CURRENT_VERSION=$(grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' "$RELEASE_LOG" | tail -1)
fi

if [ -z "$CURRENT_VERSION" ]; then
    echo "Error: Could not determine current version"
    exit 1
fi

echo "Current version: $CURRENT_VERSION"

# Get new version (from argument or auto-increment)
if [ -n "$1" ]; then
    NEW_VERSION="$1"
    if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "Error: Invalid version format. Use X.Y.Z (e.g., 0.7.5)"
        exit 1
    fi
else
    # Auto-increment patch version
    IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"
    patch=$((patch + 1))
    NEW_VERSION="$major.$minor.$patch"
    echo "Auto-incremented version: $NEW_VERSION"
fi

# Find the last release commit
LAST_RELEASE_COMMIT=$(git log --oneline | grep -E "[0-9]+\.[0-9]+\.[0-9]+" | head -1 | cut -d' ' -f1)

# Show commits since last release
echo ""
echo "Commits since last release:"
if [ -n "$LAST_RELEASE_COMMIT" ]; then
    git log --oneline "$LAST_RELEASE_COMMIT"..HEAD
else
    echo "(No previous release found, showing recent commits)"
    git log --oneline -10
fi
echo ""

# Prompt for release notes
echo -n "Enter release notes: "
read RELEASE_NOTES

if [ -z "$RELEASE_NOTES" ]; then
    echo "Error: Release notes cannot be empty"
    exit 1
fi

# Get current date
DATE=$(date +"%d %b %Y")

# Update release_log.txt
echo "" >> "$RELEASE_LOG"
echo "$DATE" >> "$RELEASE_LOG"
echo "$NEW_VERSION" >> "$RELEASE_LOG"
echo "$RELEASE_NOTES" >> "$RELEASE_LOG"

# Update manifest.json in source repo
if command -v jq > /dev/null 2>&1; then
    jq ". + {version: \"$NEW_VERSION\"}" "$SOURCE_DIR/manifest.json" > "$SOURCE_DIR/manifest.json.tmp"
    mv "$SOURCE_DIR/manifest.json.tmp" "$SOURCE_DIR/manifest.json"
else
    # Fallback: use Python for JSON manipulation
    python3 << EOF
import json
with open('$SOURCE_DIR/manifest.json', 'r') as f:
    data = json.load(f)
data['version'] = '$NEW_VERSION'
with open('$SOURCE_DIR/manifest.json', 'w') as f:
    json.dump(data, f, indent=4)
EOF
fi

# Copy files to deploy directory (exclude .git, delete files not in source)
rsync -av --delete --exclude='.git' "$SOURCE_DIR/" "$DEPLOY_DIR/"

# Update manifest.json in deploy repo
if command -v jq > /dev/null 2>&1; then
    jq ". + {version: \"$NEW_VERSION\"}" "$DEPLOY_DIR/manifest.json" > "$DEPLOY_DIR/manifest.json.tmp"
    mv "$DEPLOY_DIR/manifest.json.tmp" "$DEPLOY_DIR/manifest.json"
else
    python3 << EOF
import json
with open('$DEPLOY_DIR/manifest.json', 'r') as f:
    data = json.load(f)
data['version'] = '$NEW_VERSION'
with open('$DEPLOY_DIR/manifest.json', 'w') as f:
    json.dump(data, f, indent=4)
EOF
fi

# Commit in source repo
git add "$RELEASE_LOG" "$SOURCE_DIR/manifest.json"
git commit -m "Release v$NEW_VERSION: $RELEASE_NOTES"

# Commit in deploy repo
cd "$DEPLOY_DIR"
git add -A
git commit -m "Release v$NEW_VERSION: $RELEASE_NOTES"
cd - > /dev/null

# Push both repos
echo "Pushing source repo..."
git push origin master

echo "Pushing deploy repo..."
cd "$DEPLOY_DIR"
git push origin gh-pages
cd - > /dev/null

echo "Deployment complete! Version $NEW_VERSION has been deployed."

