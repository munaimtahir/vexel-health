# Repository Size Management

## Overview

This repository implements strict size management to ensure fast cloning, efficient CI/CD, and good developer experience.

## Size Guidelines

- **Target**: Keep repository under 10MB
- **Warning threshold**: 10-20MB
- **Critical threshold**: Over 20MB requires immediate action

## What NOT to Commit

### Build Artifacts (NEVER commit these)

- `.NET` build outputs:
  - `bin/` directories
  - `obj/` directories
  - `*.dll`, `*.exe`, `*.pdb` files
  
- JavaScript/Node build outputs:
  - `node_modules/` directories
  - `dist/` directories
  - `.next/` directories

- Native libraries:
  - `*.dylib` (macOS)
  - `*.so` (Linux)
  - `*.dll` (Windows native)

### Temporary/Generated Files

- Deployment logs: `DEPLOY_RUNS/`
- Audit evidence: `_audit_evidence/`
- Test reports: `audit_report.json`
- IDE configuration: `.vscode/`, `.idea/`
- OS files: `.DS_Store`, `Thumbs.db`

### Large Data Files

- Database dumps
- Large test fixtures (>100KB)
- Binary assets (use Git LFS if needed)
- Compiled documentation

## Best Practices

1. **Always review `.gitignore`** before committing
2. **Run size check** before pushing: `npm run check:size`
3. **Keep dependencies minimal** - only add what's necessary
4. **Use package managers** - let npm/dotnet/docker handle dependencies
5. **Commit source, not builds** - CI should build artifacts

## Checking Repository Size

### Manual Check

```bash
# Check git history size
du -sh .git

# Check tracked files
git ls-files | xargs du -ch | tail -1

# Find large tracked files
git ls-files | xargs du -h | sort -rh | head -20
```

### Automated Check

```bash
# Run the size checker script
./scripts/check-repo-size.sh

# Or via npm
npm run check:size
```

## Cleaning Up Committed Artifacts

If build artifacts were accidentally committed:

```bash
# Remove from index (keeps local files)
git rm -r --cached path/to/artifacts

# Update .gitignore to prevent re-adding
echo "path/to/artifacts/" >> .gitignore

# Commit the removal
git add .gitignore
git commit -m "chore: remove build artifacts from tracking"
```

## CI/CD Integration

The size check script can be integrated into:

1. **Pre-commit hooks** (local validation)
2. **GitHub Actions** (PR validation)
3. **Pre-push hooks** (prevent large pushes)

## Why This Matters

- **Faster clones**: Developers get started quickly
- **Efficient CI**: Less time downloading repository
- **Better collaboration**: Easier to review changes
- **Storage costs**: Keep hosting costs down
- **Git performance**: Operations remain fast

## Current Status

Run `./scripts/check-repo-size.sh` to see the current repository status and any problematic files.

## Support

If you need to commit large files legitimately (e.g., test fixtures, documentation assets), consider:

1. **Git LFS** for binary assets
2. **External storage** for large datasets
3. **CDN** for media files
4. **Separate artifacts repo** for deployment packages
