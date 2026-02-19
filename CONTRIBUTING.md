# CONTRIBUTING.md
Date: 2026-02-18

## Branching
- main: stable
- feature/*: new work
- fix/*: bug fixes

## PR rules
- Small PRs preferred
- Must include tests where applicable
- Must update docs if behavior changes
- Must not break contract generation
- **Must keep repository size under control** (run `npm run check:size`)

## Code style
- Follow repository lint rules
- Keep module boundaries clean

## Repository Size Management
- **Never commit build artifacts** (bin/, obj/, dist/, node_modules/)
- **Check size before pushing**: Run `npm run check:size`
- Keep repository under 10MB (warning at 20MB)
- See [docs/REPOSITORY_SIZE.md](docs/REPOSITORY_SIZE.md) for full guidelines
