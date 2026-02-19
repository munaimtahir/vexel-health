#!/bin/bash

# Repository size checker
# This script checks the git repository size and warns if it exceeds thresholds

set -e

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Size thresholds in MB
WARNING_THRESHOLD=10
ERROR_THRESHOLD=20

echo "🔍 Checking repository size..."

# Get repository root
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# Check .git folder size (history)
GIT_SIZE=$(du -sm .git | cut -f1)
echo "  Git history size: ${GIT_SIZE}MB"

# Check working tree size (tracked files only)
TRACKED_SIZE=$(git ls-files -z | xargs -0 du -ch 2>/dev/null | tail -1 | cut -f1)
echo "  Tracked files size: ${TRACKED_SIZE}"

# Check for large files (>1MB) that are tracked
echo ""
echo "📦 Large tracked files (>1MB):"
LARGE_FILES=$(git ls-files | xargs -I {} du -h {} 2>/dev/null | awk '$1 ~ /M$/ {gsub(/M/, "", $1); if ($1+0 >= 1) print}' | sort -rh)

if [ -z "$LARGE_FILES" ]; then
  echo "  ✅ No large files found"
else
  echo "$LARGE_FILES" | head -10
  LARGE_COUNT=$(echo "$LARGE_FILES" | wc -l)
  if [ "$LARGE_COUNT" -gt 10 ]; then
    echo "  ... and $((LARGE_COUNT - 10)) more"
  fi
fi

# Check for commonly ignored files that shouldn't be tracked
echo ""
echo "⚠️  Checking for files that should be ignored:"
SHOULD_BE_IGNORED=$(git ls-files | grep -E '(bin/|obj/|node_modules/|dist/|\.next/|\.dll$|\.exe$|\.dylib$|\.so$|DEPLOY_RUNS/|_audit_evidence/|audit_report\.json)' || true)

if [ -z "$SHOULD_BE_IGNORED" ]; then
  echo "  ✅ No problematic files tracked"
else
  echo -e "${YELLOW}  Found files that should be in .gitignore:${NC}"
  echo "$SHOULD_BE_IGNORED" | head -20
  COUNT=$(echo "$SHOULD_BE_IGNORED" | wc -l)
  if [ "$COUNT" -gt 20 ]; then
    echo "  ... and $((COUNT - 20)) more"
  fi
fi

# Final verdict based on git size
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$GIT_SIZE" -ge "$ERROR_THRESHOLD" ]; then
  echo -e "${RED}❌ REPOSITORY SIZE CRITICAL: ${GIT_SIZE}MB (threshold: ${ERROR_THRESHOLD}MB)${NC}"
  echo "   Repository history is too large. Consider cleaning up committed artifacts."
  exit 1
elif [ "$GIT_SIZE" -ge "$WARNING_THRESHOLD" ]; then
  echo -e "${YELLOW}⚠️  REPOSITORY SIZE WARNING: ${GIT_SIZE}MB (threshold: ${WARNING_THRESHOLD}MB)${NC}"
  echo "   Repository is growing. Review and clean up if needed."
  exit 0
else
  echo -e "${GREEN}✅ Repository size OK: ${GIT_SIZE}MB${NC}"
  exit 0
fi
