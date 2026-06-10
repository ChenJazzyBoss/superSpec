# Contributing to superSpec

Thank you for your interest in contributing to superSpec! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js >= 20
- npm >= 9

### Install & Build

```bash
git clone https://github.com/ChenJazzyBoss/superSpec.git
cd superSpec
npm install
npm run build
```

### Run Tests

```bash
# Full test suite
npm test

# Single test file
npx vitest run test/path/to/test.ts

# Watch mode
npx vitest test/path/to/test.ts
```

## Development Workflow

### Branch Naming

Create a feature branch from `main`:

```
feat/<short-description>     # New features
fix/<short-description>      # Bug fixes
docs/<short-description>     # Documentation
```

### Commit Messages

Use Chinese commit messages with the following format:

```
功能(<范围>): <描述>
修复(<范围>): <描述>
文档(<范围>): <描述>
测试(<范围>): <描述>
```

Examples:
```
功能(校验): 添加模块清单校验支持
修复(构建): 集成 bundle-validate 到 build 流程
文档(README): 更新新功能说明
```

### Code Style

- TypeScript strict mode
- Functions and variables: `camelCase`
- Types and interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Comment density should match surrounding code

### Test Requirements

- Every new feature MUST have tests
- Test files go in `test/` directory
- Test coverage target: 80%+
- Three test layers:
  - **Unit tests**: `test/core/` — test individual modules
  - **Integration tests**: `test/integration/` — test module interactions
  - **E2E tests**: `test/e2e/` — test CLI commands end-to-end

## Architecture Overview

```
src/
├── core/                    # Core engine (do not modify without discussion)
│   ├── spec-schema.ts       # Zod schemas
│   ├── spec-parser.ts       # Markdown → Spec parser
│   ├── validator.ts         # Dual-layer validation engine
│   ├── rules/               # Rule engine
│   ├── anti-rationalization/# SkillGuard anti-hallucination
│   ├── pipeline/            # Workflow orchestration
│   ├── delta-spec/          # Incremental changes
│   └── diagrams/            # Diagram generation
├── skills/                  # Claude Code skills (11 skills)
├── adapters/                # Test code generators
├── cli/                     # CLI entry point
└── ci/                      # CI integration
```

### Design Principles

1. **Deterministic first** — Programmatic checks for determinism, AI for judgment
2. **Compact skills** — Skills must be concise; reference material goes in `references/`
3. **Evidence-driven** — Completion claims must include evidence
4. **Defensive design** — Multi-level gates prevent AI skip patterns
5. **Extensibility** — Core is immutable; peripherals are replaceable

## Using superSpec for Development

superSpec uses its own spec-driven workflow (dogfooding):

1. Write a spec in `.superspec/specs/<name>/spec.md`
2. Validate with `node bin/superspec.js validate <name>`
3. Create a plan in `.superspec/plans/<name>.md`
4. Implement with tests
5. Run full test suite to verify

## Pull Request Process

1. Create a feature branch from `main`
2. Make changes with tests
3. Ensure `npm test` passes
4. Ensure `npm run build` passes
5. Create a PR with description linking to the spec (if applicable)
6. Wait for review

## Reporting Issues

Found a bug? [Open an issue](../../issues) with:

- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS

Have ideas? Start a [discussion](../../discussions).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
