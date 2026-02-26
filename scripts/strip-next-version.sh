#!/bin/sh
set -e
export LC_ALL=C

echo "[postbuild] Stripping Next.js version from .next artifacts for security…"

# Get the actual installed Next.js version
NEXT_VERSION=$(node -p "require('./node_modules/next/package.json').version" 2>/dev/null || echo "")

if [ -z "$NEXT_VERSION" ]; then
  echo "[postbuild] ⚠️ Could not detect Next.js version. Skipping strip step."
  exit 0
fi

# Find all files containing the version
FILES=$(grep -rlF "$NEXT_VERSION" .next || true)

if [ -z "$FILES" ]; then
  echo "[postbuild] ✅ No occurrences of $NEXT_VERSION found in .next."
  exit 0
fi

# Replace version with empty string (macOS compatible sed)
echo "$FILES" | xargs sed -i '' "s/$NEXT_VERSION//g"

echo "[postbuild] ✅ Removed Next.js version $NEXT_VERSION from $(echo "$FILES" | wc -l) files."
