# ADR 0001: DTO and Entity Naming Conventions

**Status:** Accepted
**Date:** 2026-08-16

## Context

DTO and entity files across the backend have accumulated inconsistent naming
(e.g. `create-user.dto.ts` vs `user-create.dto.ts`), and some entities embed
business logic methods that conceptually belong in the service layer. This
makes it harder for contributors to locate and reason about data-transfer
versus domain concerns.

## Decision

1. **Request DTOs** use the `{action}-{entity}.dto.ts` convention, e.g.
   `create-user.dto.ts`, `update-user.dto.ts`, `search-certificates.dto.ts`.
2. **Response DTOs** use the `{entity}-response.dto.ts` convention (e.g.
   `user-response.dto.ts`, `certificate-qr-response.dto.ts`).
3. **Entities** are pure data models (columns and relations only). Business
   logic — such as `isLocked()`, `isPasswordResetTokenValid()`,
   `isActive()`, `isExpired()` — belongs in service classes or dedicated
   domain/policy helpers, not on the entity class itself.

## Consequences

- New DTO files must follow the convention above.
- Existing files are migrated incrementally per module; renames must be
  accompanied by a barrel-export update (`index.ts`) so imports remain stable.
- Existing entity helper methods are retained for compatibility until their
  callers are migrated to service-layer equivalents, then removed.
- Any module that cannot follow the convention (e.g. shared/common DTOs) must
  document the exception in that module's `README.md`.
