# Safe to Delete - Repository Cleanup Guide

## Directories Safe to Delete Locally

The following directories are **build artifacts** or **temporary files** that can be safely deleted from your local checkout. They are now properly excluded from git tracking via `.gitignore`.

### .NET Build Artifacts (49MB)
```bash
apps/pdf/bin/       # .NET compiled binaries and runtime dependencies
apps/pdf/obj/       # .NET intermediate build files
```

**When to delete**: 
- Before committing changes
- To free up disk space
- When build errors occur

**How to regenerate**: 
```bash
cd apps/pdf
dotnet restore
dotnet build
```

### Deployment Artifacts (1.8MB)
```bash
DEPLOY_RUNS/        # Deployment run logs and evidence
```

**When to delete**:
- After reviewing deployment logs
- To reduce local storage

**How to regenerate**: 
- These are created during deployment runs
- Not needed for development

### Audit/Test Evidence (1.1MB)
```bash
_audit_evidence/    # Test execution traces and reports
audit_report.json   # npm audit results
```

**When to delete**:
- After reviewing test/audit results
- Before running fresh tests

**How to regenerate**:
```bash
npm audit --json > audit_report.json  # For audit report
# Test evidence regenerated during test runs
```

### Node.js Dependencies (if present)
```bash
node_modules/       # npm packages (currently not in repo)
**/dist/           # TypeScript/JavaScript build outputs
**/.next/          # Next.js build cache
```

**When to delete**:
- When dependencies are corrupted
- Before fresh install

**How to regenerate**:
```bash
npm install         # Restore dependencies
npm run build       # Rebuild outputs
```

## Files Removed from Git Tracking

The following files were previously tracked in git but have been removed:

1. **49MB** - apps/pdf/bin/ (17 .NET runtime files including native libs)
2. **1.8MB** - DEPLOY_RUNS/ (2 deployment logs)
3. **1.1MB** - _audit_evidence/ (15 test/audit files)
4. **260KB** - apps/pdf/obj/ (intermediate build files)
5. **12KB** - audit_report.json

**Total removed from tracking**: ~52MB of artifacts

## Git History Cleanup

⚠️ **Note**: The files are removed from tracking but still exist in git history (22MB in `.git` folder).

To completely remove them from history (advanced, requires force push):

```bash
# WARNING: This rewrites git history. Coordinate with team!
git filter-branch --force --index-filter \
  'git rm -rf --cached --ignore-unmatch apps/pdf/bin apps/pdf/obj DEPLOY_RUNS _audit_evidence audit_report.json' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (destructive!)
git push origin --force --all
git push origin --force --tags

# Clean up local repo
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Alternative (safer)**: Accept the current history size (22MB) and prevent future bloat with the new `.gitignore` and size checks.

## Prevention Moving Forward

1. ✅ Updated `.gitignore` to exclude build artifacts
2. ✅ Added `npm run check:size` to validate before commits
3. ✅ Created documentation in `docs/REPOSITORY_SIZE.md`
4. ✅ Updated CONTRIBUTING.md with size guidelines

## Repository Size Expectations

- **Current working tree**: ~2MB (source code only)
- **Git history**: 22MB (includes removed artifacts in history)
- **Total repository**: ~24MB after cleanup

**Is this acceptable?**
- If the 22MB history is acceptable, no further action needed
- If history must be reduced, coordinate git history rewrite with team
- Moving forward, new commits won't add build artifacts (prevented by .gitignore)

## Quick Commands

```bash
# Check current size
npm run check:size

# Clean local build artifacts
rm -rf apps/pdf/bin apps/pdf/obj DEPLOY_RUNS _audit_evidence

# Rebuild .NET app
cd apps/pdf && dotnet build

# Rebuild Node.js apps
npm install
npm run build --workspaces
```
