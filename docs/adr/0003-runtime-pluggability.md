# ADR-0003: Runtime pluggability

## Status

Accepted

## Context

Users require different runtime providers and execution models.

## Decision

Define a runtime adapter interface and avoid direct vendor SDK coupling in core packages.

## Consequences

- Positive: Lower vendor lock-in.
- Negative: Additional adapter maintenance cost.
- Follow-up: Add capability declarations to adapter contracts.
