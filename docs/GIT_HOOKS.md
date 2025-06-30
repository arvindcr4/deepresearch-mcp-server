# Git Hooks Setup

This project uses automated git hooks to ensure code quality and consistency.

## Pre-commit Hook

The pre-commit hook runs automatically before each commit and:

1. **Lints TypeScript files** - Runs ESLint with auto-fix on all `.ts` and `.tsx` files
2. **Formats code** - Runs Prettier on all supported file types
3. **Type checks** - Runs TypeScript compiler to check for type errors
4. **Only processes staged files** - Uses lint-staged to only check files you're committing

### What happens:

- If linting finds fixable issues, they will be automatically fixed
- If there are unfixable linting errors, the commit will be blocked
- If there are TypeScript type errors, the commit will be blocked
- Fixed files will be automatically added back to your commit

## Pre-push Hook

The pre-push hook runs before pushing to remote and:

1. **Runs all tests** - Executes the full test suite
2. **Blocks push on test failure** - Prevents pushing broken code

## Commit Message Hook

The commit-msg hook enforces conventional commit format:

```
<type>(<scope>): <subject>
```

### Valid types:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools
- `perf`: A code change that improves performance
- `ci`: Changes to CI configuration files and scripts
- `build`: Changes that affect the build system or external dependencies
- `revert`: Reverts a previous commit

### Examples:

- `feat(auth): add login functionality`
- `fix(api): handle null response correctly`
- `docs: update README with new examples`
- `chore(deps): update dependencies`

## Bypassing Hooks (Emergency Only!)

If you absolutely need to bypass hooks in an emergency:

```bash
# Bypass pre-commit hook
git commit --no-verify -m "emergency fix"

# Bypass pre-push hook
git push --no-verify
```

**⚠️ Use with extreme caution!** Bypassing hooks can lead to:

- Broken builds
- Failed CI/CD pipelines
- Code style inconsistencies
- Type errors in production

## Setup

The hooks are automatically set up when you run `npm install` thanks to Husky's prepare script.

If hooks aren't working:

```bash
# Reinstall husky
npm run prepare

# Make hooks executable
chmod +x .husky/*
```

## Configuration

- **Husky config**: `.husky/` directory
- **Lint-staged config**: `.lintstagedrc.json`
- **ESLint config**: `eslint.config.js`
- **Prettier config**: `.prettierrc`

## Troubleshooting

### Hooks not running

```bash
# Check if husky is installed
ls -la .husky/

# Reinstall
npx husky install
```

### Lint errors you can't fix

```bash
# See the specific errors
npm run lint

# Try auto-fix
npm run lint:fix
```

### Type errors

```bash
# Check TypeScript errors
npx tsc --noEmit
```

### Tests failing

```bash
# Run tests with details
npm test -- --verbose
```
