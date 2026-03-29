# Contributing Guide

## Prerequisites

- Node.js 22+
- pnpm 10+

## Setup

```bash
pnpm install
```

## Quality Gates

```bash
pnpm lint
pnpm test
pnpm build
```

Or run all checks:

```bash
pnpm check
```

## Structure

- `packages/*`: core domain and contracts
- `integrations/*`: adapters and backend implementations
- `apps/*`: runnable applications
- `docs/*`: product and design documentation

## Pull Request Expectations

- Keep changes focused and small.
- Add tests for non-trivial behavior.
- Keep contracts stable and explicit.
