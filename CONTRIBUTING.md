# Contributing

This repo contains a backend (NestJS), a frontend (Vite + React), and Soroban smart contracts.

## Local Development Setup

This section walks through getting a local environment running and executing the test suite.

### Prerequisites

- Node.js 20 (LTS)
- Rust stable (for the Soroban contracts)
- PostgreSQL 15
- Redis 7 (required for Bull queues)

### Backend

```bash
# from repo root
cp backend/.env.example backend/.env
cd backend
npm ci
npm test
```

Fill in the five minimum required variables in `backend/.env`:

1. `JWT_SECRET` — required (no default); `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` fall back to it.
2. `DB_HOST` — PostgreSQL host (defaults to `localhost`).
3. `DB_PORT` — PostgreSQL port (defaults to `5432`).
4. `DB_USERNAME` — PostgreSQL user (defaults to `postgres`).
5. `DB_PASSWORD` — PostgreSQL password (defaults to `password`).

`DB_NAME` defaults to `kaystcx`; set it as well if you use a different database name. All other variables (`STELLAR_NETWORK`, `STELLAR_HORIZON_URL`, `ALLOWED_ORIGINS`, …) have safe defaults.

### Frontend

```bash
# from repo root
cp frontend/.env.example frontend/.env
cd frontend
npm ci
npm test -- --run
```

The frontend requires one variable: `VITE_API_URL` (e.g. `http://localhost:3000/api/v1`). The app fails fast on startup if it is missing.

### Contracts

```bash
# from repo root
rustup target add wasm32-unknown-unknown
cd stellar-contracts
cargo test
```

### Full stack with Docker

To start the whole stack (Postgres, Redis, backend, frontend, nginx, Prometheus):

Testing and CI

Run the full test suite locally before opening a PR. CI runs the same commands.

### Backend

```bash
cd backend
npm ci
npm test
```

Backend unit tests use Jest and live under `backend/src/**/*.spec.ts`. The e2e
suite (`backend/test`) is run separately with `npm run test:e2e`.

### Frontend

```bash
cd frontend
npm ci
npm test -- --run
```

The frontend uses Vitest (not Jest). The `--run` flag runs the suite once in
single-run mode and exits (rather than entering watch mode).

### Contracts

```bash
cd stellar-contracts
cargo test
```

### CI

The CI workflow (`.github/workflows/ci.yml`) runs:

- Frontend: `npm run build` then `npm test -- --run`
- Backend: typecheck, build, then `npm test` (with PostgreSQL and Redis services)
- Contracts: `cargo build` then `cargo test`

A failing test in any job fails the job and blocks the merge.

## Backend code conventions — DTOs and entities

To keep the backend consistent and easy to navigate, follow these conventions when adding or refactoring modules:

**DTOs** (`backend/src/modules/*/dto/`)

- Request DTOs are named `{action}-{entity}.dto.ts` — e.g. `create-user.dto.ts`, `search-certificates.dto.ts`, `verify-email.dto.ts`.
- Response DTOs are named `{entity}-response.dto.ts` — e.g. `user-response.dto.ts`, `audit-statistics-response.dto.ts`.
- Keep one DTO class per file, and export it through the module's `dto/index.ts` barrel.
- DTOs are for data transfer only (request validation / response serialization). Do not mix unrelated request and response shapes in the same file.

**Entities** (`backend/src/modules/*/entities/`)

- Entities are pure data models. Keep `@Column`/`@Entity` metadata and relationships, but do not add business-logic methods (e.g. `isLocked()`, `isPasswordResetTokenValid()`, `addVerificationRecord()`).
- Business rules that operate on an entity belong in a service (or a small pure helper module under `utils/`), where they can be unit-tested independently.

## Branching and pull requests

- Create a feature branch off `main` with a short, descriptive name (e.g. `feat/issuerprofile-real-stats`).
- Push the branch and open a pull request on GitHub:

```bash
git push -u origin <branch-name>
```

- Reference the issue(s) your PR resolves in the description (e.g. `Closes #123`) so they are closed automatically when the PR merges.
