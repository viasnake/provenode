# ADR-0001: Core-first

## Status

Accepted

## Context

The project has many surfaces (CLI, UI, API, MCP), but all depend on stable knowledge contracts.

## Decision

Prioritize core packages and contracts before feature-rich surfaces.

## Consequences

- Positive: Lower rework risk across all surfaces.
- Negative: Early demos look limited.
- Follow-up: Add integration layers only after core contracts pass checks.
