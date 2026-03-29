# ADR-0004: Single-process capable

## Status

Accepted

## Context

The OSS target needs local-first operation with low setup cost.

## Decision

All core workflows must be runnable in single-process mode.

## Consequences

- Positive: Better onboarding and local development speed.
- Negative: Requires careful boundary design for future scale-out.
- Follow-up: Keep service extraction as a deployment concern.
