# Database Migration Strategy

## Overview

Kaystcx uses **TypeORM**. This document defines how migrations are managed
across environments so that `synchronize: true` is **never used in production**.

---

## Environment Rules

| Environment | `synchronize` | Migration source |
|-------------|---------------|-----------------|
| development | `false`       | `npm run migration:run` |
| test        | `false`       | `npm run migration:run` |
| production  | `false`       | `npm run migration:run` |

> **Important:** `synchronize: true` auto-alters tables on start-up and can
> cause irreversible data loss. It must remain `false` in all environments.

---

## Workflow

### 1. Generate a migration after entity changes

```bash
npm run migration:generate -- src/database/migrations/<MigrationName>
```

TypeORM diffs the current schema against the compiled entities and produces a
timestamped migration file.

### 2. Review the generated file

Check `src/database/migrations/<timestamp>-<MigrationName>.ts` for:
- Unintended `DROP` or `ALTER` statements.
- Missing index creation.
- Correct `up()` and matching `down()` rollback.

### 3. Run migrations locally

```bash
npm run migration:run
```

### 4. Rollback if needed

```bash
npm run migration:revert
```

---

## CI Check

The CI pipeline runs the following step on every pull request that touches
`backend/src/**`:

```yaml
- name: Check pending migrations
  run: |
    npm run migration:generate -- src/database/migrations/ci-check --check
```

The `--check` flag exits with a non-zero code when entity changes exist that
have no corresponding migration file, failing the build before deployment.

---

## Naming Convention

```
<timestamp>-<PascalCaseDescription>.ts
```

Example: `1714000000000-AddVerificationTokenToUser.ts`

---

## Scripts (package.json)

```json
{
  "migration:generate": "typeorm migration:generate -d src/database/data-source.ts",
  "migration:run":      "typeorm migration:run      -d src/database/data-source.ts",
  "migration:revert":   "typeorm migration:revert   -d src/database/data-source.ts",
  "migration:show":     "typeorm migration:show     -d src/database/data-source.ts"
}
```
