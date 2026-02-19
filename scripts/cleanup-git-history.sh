#!/bin/bash

# Git History Cleanup Script (ADVANCED/DESTRUCTIVE)
# This script removes build artifacts from git history using git filter-branch
# 
# ⚠️  WARNING: This is a DESTRUCTIVE operation that rewrites git history!
# ⚠️  ALL team members must re-clone the repository after this operation
# ⚠️  Coordinate with your team before running this script
#
# Run this script only if you need to reduce the .git history size from 22MB

set -e

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}⚠️  WARNING: DESTRUCTIVE GIT HISTORY REWRITE ⚠️${NC}"
echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "This script will:"
echo "  1. Rewrite git history to remove build artifacts"
echo "  2. Require a force push to remote repository"
echo "  3. Require all team members to re-clone the repository"
echo ""
echo "Files to be removed from history:"
echo "  - apps/pdf/bin/"
echo "  - apps/pdf/obj/"
echo "  - DEPLOY_RUNS/"
echo "  - _audit_evidence/"
echo "  - audit_report.json"
echo ""
echo "Expected result:"
echo "  - Git history size: ~2-3MB (down from 22MB)"
echo "  - All commit history preserved"
echo "  - File contents removed from history"
echo ""
echo -e "${YELLOW}Prerequisites:${NC}"
echo "  ✓ Coordinate with all team members"
echo "  ✓ Ensure everyone has pushed their work"
echo "  ✓ Back up repository if needed"
echo "  ✓ Have git filter-branch installed"
echo ""
read -p "Do you want to continue? (type 'YES' to proceed): " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
  echo "Aborted. No changes made."
  exit 0
fi

echo ""
echo "🔧 Starting git history cleanup..."

# Backup current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "  Current branch: $CURRENT_BRANCH"

# Create backup tag
BACKUP_TAG="backup-before-cleanup-$(date +%Y%m%d-%H%M%S)"
git tag "$BACKUP_TAG"
echo "  ✓ Created backup tag: $BACKUP_TAG"

# Remove files from all history
echo ""
echo "  Removing files from git history..."
git filter-branch --force --index-filter \
  'git rm -rf --cached --ignore-unmatch \
    apps/pdf/bin \
    apps/pdf/obj \
    DEPLOY_RUNS \
    _audit_evidence \
    audit_report.json' \
  --prune-empty \
  --tag-name-filter cat -- --all

echo "  ✓ Files removed from history"

# Clean up refs
echo ""
echo "  Cleaning up refs..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all

# Garbage collect
echo "  Running aggressive garbage collection..."
git gc --prune=now --aggressive

echo ""
echo -e "${GREEN}✅ Git history cleanup complete!${NC}"

# Check new size
NEW_SIZE=$(du -sm .git | cut -f1)
echo ""
echo "📊 New repository size: ${NEW_SIZE}MB"

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review the changes: git log"
echo "  2. Test that everything works"
echo "  3. Force push to remote:"
echo "     ${YELLOW}git push origin --force --all${NC}"
echo "     ${YELLOW}git push origin --force --tags${NC}"
echo ""
echo "  4. Notify team members to:"
echo "     a. Save any uncommitted work"
echo "     b. Delete their local repository"
echo "     c. Fresh clone from remote"
echo ""
echo -e "${YELLOW}To rollback (before force push):${NC}"
echo "  git reset --hard $BACKUP_TAG"
echo "  git tag -d $BACKUP_TAG"
echo ""
