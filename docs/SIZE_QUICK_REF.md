# Repository Size - Quick Reference

## Check Repository Size

```bash
npm run check:size
```

## What's Safe to Delete Locally?

These directories are **build artifacts** and can be deleted anytime:

```bash
# Delete all build artifacts
rm -rf apps/pdf/bin apps/pdf/obj DEPLOY_RUNS _audit_evidence

# Delete specific ones
rm -rf apps/pdf/bin        # .NET build outputs (49MB)
rm -rf apps/pdf/obj        # .NET intermediate files
rm -rf DEPLOY_RUNS         # Deployment logs (1.8MB)
rm -rf _audit_evidence     # Test traces (1.1MB)
rm -f audit_report.json    # npm audit results
```

## Rebuild After Cleanup

```bash
# .NET app
cd apps/pdf && dotnet build && cd ../..

# Node.js dependencies
npm install

# All apps
npm run build --workspaces
```

## Current State

- **Tracked files**: 1.9MB ✅ (source code only)
- **Git history**: 22MB (contains old artifacts)
- **Local artifacts**: ~52MB (can be deleted)

## Before Committing

```bash
# Always check before git add/commit
npm run check:size
git status

# Ensure no build artifacts are staged
git diff --cached --stat
```

## Size Thresholds

- ✅ **Good**: Under 10MB
- ⚠️  **Warning**: 10-20MB
- ❌ **Critical**: Over 20MB

## Full Documentation

- Size guidelines: `docs/REPOSITORY_SIZE.md`
- Cleanup guide: `docs/SAFE_TO_DELETE.md`
- Full summary: `REPOSITORY_SIZE_SUMMARY.md`

## Advanced: Clean Git History

If you need to reduce the 22MB git history:

```bash
# WARNING: Destructive operation!
./scripts/cleanup-git-history.sh
```

See `docs/SAFE_TO_DELETE.md` for details.
