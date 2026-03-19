#!/bin/bash

set -e

# Handle Ctrl+C gracefully
trap 'echo -e "\n\nDeployment cancelled."; exit 130' INT

ORIGINAL_BRANCH=$(git branch --show-current)
trap 'git switch "$ORIGINAL_BRANCH" >/dev/null 2>&1 || true' EXIT

SOURCE_DIR="web/dist"
SOURCE_WWW="web/public"
RELEASE_LOG="$SOURCE_WWW/release_log.txt"

# Check for uncommitted changes in source repo
if ! git diff-index --quiet HEAD --; then
    echo "Error: Uncommitted changes in source repo. Please commit or stash them first."
    exit 1
fi

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
    echo "New version: $NEW_VERSION"
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

# Update manifest.json in source repo (public directory, before build)
if command -v jq > /dev/null 2>&1; then
    jq ". + {version: \"$NEW_VERSION\"}" "$SOURCE_WWW/manifest.json" > "$SOURCE_WWW/manifest.json.tmp"
    mv "$SOURCE_WWW/manifest.json.tmp" "$SOURCE_WWW/manifest.json"
else
    # Fallback: use Python for JSON manipulation
    python3 << EOF
import json
with open('$SOURCE_WWW/manifest.json', 'r') as f:
    data = json.load(f)
data['version'] = '$NEW_VERSION'
with open('$SOURCE_WWW/manifest.json', 'w') as f:
    json.dump(data, f, indent=4)
EOF
fi


# Commit in source repo
git add "$RELEASE_LOG" "$SOURCE_WWW/manifest.json"
git commit -m "v$NEW_VERSION: $RELEASE_NOTES"


# Push both repos
echo "Pushing source repo..."
git push origin master

echo "Updating production branch to match master and pushing..."
git switch production && git reset --hard master && git push --force-with-lease origin production


echo "Deployment complete! Version $NEW_VERSION has been deployed."