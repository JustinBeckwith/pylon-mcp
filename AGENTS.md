# Agent Guidelines

## Making Changes

When making changes to this repository:

1. **Create a new branch** from `main`:
   ```bash
   git checkout -b feature/description-of-change
   ```

2. **Make your changes** and commit them:
   ```bash
   git add -A
   git commit -m "type: description of change"
   ```

3. **Push the branch** and create a pull request:
   ```bash
   git push -u origin feature/description-of-change
   gh pr create --title "type: description" --body "Description of changes"
   ```

4. **Do not push directly to `main`** - all changes should go through pull requests.

## Commit Message Format

Use conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `test:` - Test additions/changes

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm run build        # Build the project
pnpm run typecheck    # Type check all TypeScript
pnpm run lint         # Run linter
pnpm run fix          # Auto-fix lint/format issues
pnpm run test         # Run tests
pnpm run validate:mcp # Validate MCP configuration
```
