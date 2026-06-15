# Quality Improvement Issues

This document catalogs 30 actionable quality issues across the Kaystcx monorepo. Each issue follows open-source best practices with clear descriptions, expected vs. current behavior, and suggested approaches for contributors.

---

## Backend (`/backend`) — 14 Issues

---

### Issue B1: `CertificateService.search()` Uses Unsafe Type Casting on DTOs

**File:** `src/modules/certificate/certificate.service.ts`

**Current Behavior:** The `search()` method casts `SearchCertificatesDto` to `any` repeatedly:
```typescript
if ((dto as any).search) { ... }
if ((dto as any).status) { ... }
```

This bypasses TypeScript's type checking entirely, making the method fragile to refactoring and hiding property access errors at compile time.

**Expected Behavior:** The `SearchCertificatesDto` class should expose all fields used in query building. If some fields are optional, the type should reflect that with optional properties rather than `any` casts.

**Suggested Approach:** Expand `SearchCertificatesDto` to include the fields used in the search query builder. Remove all `as any` casts and use proper typed access. Add unit tests that verify each search filter path.

**Difficulty:** Good first issue | **Area:** Type safety, Certificate module

---

### Issue B2: `Promise.all` Without Error Isolation in Statistics Services

**Files:** `src/modules/admin-analytics/services/admin-analytics.service.ts`, `src/modules/certificate/services/stats.service.ts`, `src/modules/users/users.service.ts`

**Current Behavior:** Multiple services use `await Promise.all([...])` for parallel data fetching. If any single promise in the batch rejects, the entire operation fails with an unhandled rejection. This means a transient failure in one statistics source (e.g., a Redis timeout on a cache query) can break the entire dashboard render.

**Expected Behavior:** Independent data fetches should be isolated so a single failure doesn't cascade. Use `Promise.allSettled()` where appropriate, or wrap individual promises with error handlers that return sensible defaults on failure.

**Suggested Approach:**
1. Audit all `Promise.all` calls in statistics/analytics services
2. Replace with `Promise.allSettled()` where each result is independent
3. Add per-query error handling that returns `0` or `null` for failed sub-queries
4. Log individual failures without crashing the aggregate response

**Difficulty:** Intermediate | **Area:** Error handling, Observability

---

### Issue B3: `console.log` Used Instead of Injected Logger in Production Code

**Files:** `src/common/filters/http-exception.filter.ts`, `src/main.ts`, `src/utils/check-snapshots.ts`

**Current Behavior:** Several production files use `console.error()` and `console.log()` directly instead of the injected `LoggingService`. This breaks structured logging, correlation ID propagation, and makes log aggregation harder.

```typescript
// In http-exception.filter.ts
console.error(`Unhandled Exception for ${request.method} ${request.url}`);

// In main.ts
console.error('Failed to start application:', error);
```

**Expected Behavior:** All logging should go through the `LoggingService` (or NestJS `Logger`) to ensure consistent formatting, log levels, and transport.

**Suggested Approach:** Replace `console.log`/`console.error` with the appropriate `LoggingService` methods. For the exception filter, the `LoggingService` is already injected — just use `this.loggingService.error()`. For `main.ts`, inject or create a `Logger` instance.

**Difficulty:** Good first issue | **Area:** Logging, Observability

---

### Issue B4: `soroban.service.ts` Uses `require()` and `error: any` Types

**File:** `src/modules/stellar/services/soroban.service.ts`

**Current Behavior:** The service uses a dynamic `require('@stellar/stellar-sdk')` call (line 60) and catches errors with `error: any` in all 10+ catch blocks. The `require()` bypasses TypeScript module resolution and prevents tree-shaking. The `any` catch types lose all type safety.

**Expected Behavior:** Static imports should be used at the top of the file. Error types should be properly constrained — at minimum `unknown` with narrowing, or a specific error union type.

**Suggested Approach:**
1. Replace `new (require('@stellar/stellar-sdk').rpc.Server)(...)` with the proper static import
2. Change all `catch (error: any)` to `catch (error: unknown)` and narrow with `error instanceof Error`
3. Extract the common `Promise.all` + polling pattern into a reusable helper

**Difficulty:** Intermediate | **Area:** Stellar module, Type safety

---

### Issue B5: Inconsistent `AppException` Propagation in Global Exception Filter

**File:** `src/common/exceptions/global-exception.filter.ts`

**Current Behavior:** The `GlobalExceptionFilter` handles `AppException`, `BadRequestException`, `HttpException`, and unknown exceptions via an `instanceof` chain. The `AppException` branch spreads `appException.getResponse()` into the error response without validating the shape of the response data. This could expose internal state or return malformed responses if the exception response format deviates from `ErrorResponse`.

**Expected Behavior:** The filter should validate the shape of the response from `AppException` before spreading it into the response. Unknown properties should be filtered out, especially in production mode.

**Suggested Approach:**
1. Define an explicit mapping from `AppException` properties to `ErrorResponse` fields
2. Strip unknown properties before constructing the response
3. Add unit tests for each exception type branch in the filter
4. Ensure `details` and `stack` are always stripped in production regardless of exception type

**Difficulty:** Intermediate | **Area:** Error handling, Security

---

### Issue B6: `CertificateService.freeze()` and `unfreeze()` Reuse Wrong Webhook Events

**File:** `src/modules/certificate/certificate.service.ts`

**Current Behavior:** When a certificate is frozen, the service fires `WebhookEvent.CERTIFICATE_REVOKED`. When unfrozen, it fires `WebhookEvent.CERTIFICATE_ISSUED`. Both are semantically incorrect — freezing is not revocation, and unfreezing is not a new issuance. Consumers of these webhooks (e.g., external integrations, audit logs) receive misleading signals.

**Expected Behavior:** New webhook event types `CERTIFICATE_FROZEN` and `CERTIFICATE_UNFROZEN` should be added to the `WebhookEvent` enum and used in the respective methods.

**Suggested Approach:**
1. Add `CERTIFICATE_FROZEN` and `CERTIFICATE_UNFROZEN` to the `WebhookEvent` enum in `src/modules/webhooks/entities/webhook-subscription.entity.ts`
2. Update `freeze()` and `unfreeze()` to use the correct events
3. Update any downstream handlers that subscribe to the old events
4. Add a migration note for existing subscribers

**Difficulty:** Good first issue | **Area:** Webhooks, Certificate module

---

### Issue B7: `CertificateService.verifyCertificate()` Has Empty Catch Block for Failed Verifications

**File:** `src/modules/certificate/certificate.service.ts`, line ~420

**Current Behavior:** The catch block for failed certificate verifications is empty:
```typescript
catch (error) {
  if (error instanceof NotFoundException) {
    // Option: Record failed verification in DB too
  }
  throw error;
}
```

Failed verification attempts are silently not persisted, making it impossible to track fraudulent or repeated failed verification attempts.

**Expected Behavior:** Failed verification attempts should be recorded in the `Verification` entity with `success: false`, along with the attempted code, timestamp, and request metadata.

**Suggested Approach:**
1. Remove the empty conditional block
2. Save a `Verification` record with `success: false` before re-throwing
3. Consider rate-limiting failed verification attempts per IP

**Difficulty:** Good first issue | **Area:** Certificate module, Security

---

### Issue B8: `csvExport` Methods Duplicate Query Builder Logic

**File:** `src/modules/certificate/certificate.service.ts`

**Current Behavior:** The `bulkExport()` and `exportAllFiltered()` methods contain nearly identical query builder code (filtering by search, status, date range). This is a violation of DRY — any change to the filter logic must be applied in two places, and the two implementations can drift.

**Expected Behavior:** A single private method should build the base query with shared filter logic. `bulkExport()` and `exportAllFiltered()` should call this shared method and add their specific constraints (e.g., ID filtering) on top.

**Suggested Approach:**
1. Extract a private `buildFilteredQuery(filters)` method that returns a query builder with search/status/date filters applied
2. Have `bulkExport()` call it and add the ID `WHERE` clause
3. Have `exportAllFiltered()` call it directly
4. Add tests that both methods produce the expected SQL/conditions

**Difficulty:** Good first issue | **Area:** Certificate module, Code quality

---

### Issue B9: `refreshTokens` in `UserAuthService` Uses Hardcoded JWT Expiry

**File:** `src/modules/users/services/user-auth.service.ts`

**Current Behavior:** The `generateTokens()` private method hardcodes `'7d'` as the refresh token expiry string and `3600` seconds (1 hour) as the `expiresIn` return value. These should be configurable via environment variables like `JWT_REFRESH_EXPIRY` and `JWT_EXPIRES_IN`.

**Expected Behavior:** Token expiration durations should be read from `ConfigService` with sensible defaults, allowing operators to adjust token lifetimes without code changes.

**Suggested Approach:**
1. Add `JWT_REFRESH_EXPIRY` config key (default `'7d'`)
2. Add `JWT_ACCESS_EXPIRY_SECONDS` config key (default `3600`)
3. Use these values in `generateTokens()` instead of hardcoded strings/numbers
4. Update tests to verify config-driven expiry

**Difficulty:** Good first issue | **Area:** Auth module, Configuration

---

### Issue B10: `soroban.service.ts` Returns `false` on All Failures, Hiding Error Details

**File:** `src/modules/stellar/services/soroban.service.ts`

**Current Behavior:** Every public method in `SorobanService` wraps its logic in a try-catch that logs the error and returns `false` (or `null`). Callers have no way to distinguish between "transaction failed on chain," "network timeout," "invalid address," and "contract not configured." This makes debugging and alerting nearly impossible.

```typescript
catch (error: any) {
  this.logger.error(`Add issuer failed: ${message}`);
  return false;
}
```

**Expected Behavior:** Methods should throw typed exceptions that propagate to callers, allowing them to handle different failure modes appropriately. The service layer should not swallow errors.

**Suggested Approach:**
1. Define a `SorobanException`, `SorobanNetworkException`, `SorobanConfigurationException` hierarchy
2. Throw appropriate exceptions instead of returning `false`
3. Update callers in `CertificateService` to handle specific exception types
4. Keep the catch block in the outermost caller for the final fallback

**Difficulty:** Intermediate | **Area:** Stellar module, Error handling

---

### Issue B11: `UserAdminService` Has Unused `updateUserStatus` and `adminUpdateUser` Methods

**File:** `src/modules/users/services/user-admin.service.ts`

**Current Behavior:** The `UserAdminService` exposes `adminUpdateUser()`, `updateUserRole()`, `updateUserStatus()`, `deactivateUser()`, and `reactivateUser()` — five methods for user mutation. Several of these have overlapping concerns (e.g., `adminUpdateUser` can change roles, but so can `updateUserRole`). This API surface is confusing and makes it unclear which method callers should use.

**Expected Behavior:** A clear single-responsibility design should be established:
- One method for role changes
- One method for status changes  
- One method for generic profile updates (name, email, etc.)

Overlapping methods should be removed or deprecated.

**Suggested Approach:**
1. Audit all callers of these methods across controllers and tests
2. If `adminUpdateUser` duplicates functionality of other methods, mark it as `@deprecated` and consolidate
3. If callers exist for both, keep both but add clear JSDoc explaining when to use each

**Difficulty:** Good first issue | **Area:** Users module, API design

---

### Issue B12: `audit.service.ts` Lacks Pagination on `search` in the Service Layer

**File:** `src/modules/audit/services/audit.service.ts`

**Current Behavior:** The `AuditService.search()` method accepts pagination parameters (`skip`, `take`) and returns a `{ data, total }` shape, but the controller may or may not pass these through. If they're omitted, the query returns all results, which can be millions of audit log rows. This is both a performance and memory risk.

**Expected Behavior:** The service should enforce a maximum page size (e.g., 100 results) regardless of what the caller passes. If no pagination parameters are provided, a safe default should be applied.

**Suggested Approach:**
1. Add a `MAX_PAGE_SIZE` constant (e.g., 100)
2. If `take` exceeds `MAX_PAGE_SIZE` or is undefined, clamp it to `MAX_PAGE_SIZE`
3. Log a warning when the limit is clamped so operators are aware
4. Add a test that verifies the clamp behavior

**Difficulty:** Good first issue | **Area:** Audit module, Performance

---

### Issue B13: `dto/` and `entities/` Directories Have Inconsistent Naming Conventions

**Files:** Multiple `dto/` and `entities/` directories across modules

**Current Behavior:** Some modules use `*.dto.ts` files, others use `*.dto.ts` with inconsistent naming (e.g., `create-user.dto.ts` vs `user-create.dto.ts`). Some DTO files mix request validation decorators with response serialization. Entity files sometimes include business logic methods (e.g., `isLocked()`, `isPasswordResetTokenValid()`) that belong in a service layer.

**Expected Behavior:** A consistent naming convention should be applied project-wide. DTOs should be purely for data transfer (request validation/response serialization). Entity files should be pure data models without business logic.

**Suggested Approach:**
1. Adopt a convention: `{action}-{entity}.dto.ts` for request DTOs and `{entity}-response.dto.ts` for response DTOs
2. Migrate business logic methods from entities to service classes
3. Add a project-wide lint rule or ADR documenting the convention
4. This can be done incrementally per module

**Difficulty:** Intermediate | **Area:** Architecture, Consistency

---

### Issue B14: Jest Test Configuration Lacks `moduleNameMapper` for Path Aliases

**File:** `package.json` (jest config)

**Current Behavior:** The Jest configuration uses `rootDir: "src"` but does not map the TypeScript `baseUrl` path alias (`src/`). Spec files that import using absolute paths like `from 'src/common'` fail with "Cannot find module" errors. A workaround was applied but the configuration should be cleaned up.

**Expected Behavior:** Jest should resolve `src/...` imports the same way TypeScript does — from the project root. The `moduleNameMapper` should be explicitly configured for this.

**Suggested Approach:**
1. Document in `CONTRIBUTING.md` that imports should prefer relative paths within modules
2. Add `moduleNameMapper` to the jest config as a permanent fix
3. Consider adding `jest.config.ts` with `pathsToModuleNameMapper` from `ts-jest`

**Difficulty:** Good first issue | **Area:** Build tooling, Testing

---

## Frontend (`/frontend`) — 10 Issues

---

### Issue F1: `tokenStorage` Stores Both Access and Refresh Tokens in `localStorage`

**File:** `src/api/tokens.ts`

**Current Behavior:** The `tokenStorage` utility stores both access tokens and refresh tokens in `localStorage`. The file's own doc comment says "Refresh tokens handled server-side via httpOnly cookies," but the implementation stores refresh tokens in `localStorage` with `setRefreshToken()` and `getRefreshToken()`. This contradicts the stated security model — refresh tokens in `localStorage` are vulnerable to XSS attacks.

**Expected Behavior:** Access tokens can stay in memory/sessionStorage, but refresh tokens should be stored in httpOnly cookies set by the server, not accessible to JavaScript at all. The client should not have a `getRefreshToken()` function.

**Suggested Approach:**
1. Remove `getRefreshToken()` and `setRefreshToken()` from `tokenStorage` (or keep for backward compat with a deprecation notice)
2. Update `api/endpoints.ts` — the `/auth/refresh` endpoint should use the httpOnly cookie automatically
3. Remove `refreshToken` from `login()` in `AuthContext.tsx`
4. Add a test that verifies `getRefreshToken()` is never called
5. Document the updated security model

**Difficulty:** Intermediate | **Area:** Security, Auth

---

### Issue F2: `AuthContext` Stores Full User Object in `localStorage` Without Encryption

**File:** `src/context/AuthContext.tsx`

**Current Behavior:** The `AuthProvider` persists the entire `User` object (including potentially sensitive fields like `email`, `stellarPublicKey`, `role`) in `localStorage` as a plain JSON string. Any XSS vulnerability or browser extension with storage access can read this data. The `localStorage` set happens in a `useEffect` on every user state change.

**Expected Behavior:** Only a minimal, non-sensitive subset of user data should be cached (e.g., `id`, `name`, `role`). More sensitive fields should be fetched from the server when needed.

**Suggested Approach:**
1. Define a `StoredUser` interface with only essential, non-sensitive fields
2. Serialize only this subset to `localStorage`
3. Fetch full profile data from the API when detailed information is needed
4. Add a migration path for existing cached data

**Difficulty:** Intermediate | **Area:** Security, Auth

---

### Issue F3: `CertificateTable.tsx` Contains ~850 Lines — Component Is Too Large

**File:** `src/components/CertificateTable.tsx`

**Current Behavior:** This single component file is approximately 850 lines and handles search, filtering, sorting, pagination, bulk export, freeze/unfreeze, transfer, and history — plus 4 separate modal dialogs embedded inline. This violates the single-responsibility principle and makes the component extremely difficult to test, maintain, or reuse.

**Expected Behavior:** Each modal should be its own component file. Data-fetching logic should be extracted into a custom hook. The table rendering should be separated from the action toolbar.

**Suggested Approach:**
1. Extract `FreezeCertificateModal`, `RevokeCertificateModal`, `TransferCertificateModal`, and `CertificateHistoryModal` into separate files
2. Extract `useCertificateTable` custom hook with all state management and API calls
3. Extract `TableToolbar` component for search/filters/bulk actions
4. Each extracted piece should have its own unit tests

**Difficulty:** Intermediate | **Area:** Component architecture, Maintainability

---

### Issue F4: `ProtectedRoute` Has Outdated Hardcoded Route Map

**File:** `src/guard/ProtectedRoute.tsx`

**Current Behavior:** The `ProtectedRoute` component maintains a hardcoded `roleRoutes` mapping that defines which roles can access which paths. This duplicates the route configuration already defined in `App.tsx` and can easily fall out of sync when routes are added or changed. There's also no route for `UserRole.RECIPIENT` or `UserRole.VERIFIER` roles beyond what's in the map.

**Expected Behavior:** Route authorization should be centralized and derived from the route configuration rather than maintained in a separate hardcoded map. The `allowedRoles` prop should be the primary mechanism, with the fallback map removed.

**Suggested Approach:**
1. Remove the `roleRoutes` hardcoded map
2. Instead, pass `allowedRoles` explicitly on each `<Route>` in `App.tsx`
3. If a route has no `allowedRoles`, default to allowing authenticated users
4. Add a test that verifies each route in `App.tsx` has appropriate role guards

**Difficulty:** Good first issue | **Area:** Auth, Routing

---

### Issue F5: No Loading or Error State for the Freeze Modal Duration Input

**File:** `src/components/CertificateTable.tsx`

**Current Behavior:** The freeze modal has a "Maximum 90 days. Leave empty for indefinite" note that contradicts the `max={90}` HTML attribute — the HTML validation prevents empty values and rejects anything over 90, but the UI text says "Leave empty for indefinite." This is confusing. Additionally, there's no visual feedback when the freeze API call is in progress (no loading spinner on the "Freeze" button).

**Expected Behavior:**
1. The UI text should match the validation behavior
2. The submit button should show a loading state during API calls
3. Error states should be displayed inline in the modal, not just as a toast

**Suggested Approach:** Update the freeze duration description to match actual validation. Add `isFreezing` state that disables the button and shows a spinner. Display error messages from API failures directly in the modal body.

**Difficulty:** Good first issue | **Area:** UX, CertificateTable

---

### Issue F6: `api/endpoints.ts` Duplicates Dummy Data Pattern Across 20+ Functions

**File:** `src/api/endpoints.ts`

**Current Behavior:** Every API function follows the same verbose pattern:
```typescript
if (USE_DUMMY_DATA) {
  await simulateDelay();
  return dummyData.something;
}
try {
  return await apiClient<T>(...);
} catch (error) {
  return handleError(error, "functionName");
}
```

This pattern is repeated 20+ times, making the file ~1300 lines long. Adding a new endpoint requires duplicating this entire structure. It also means dummy data mode bypasses the retry and error-handling logic in `apiClient`.

**Expected Behavior:** A cleaner abstraction should reduce boilerplate. Consider a higher-order function or class that wraps API calls with the dummy-data fallback.

**Suggested Approach:**
1. Create an `apiEndpoint(name, realCall, dummyFallback)` wrapper
2. Refactor each endpoint to use the wrapper
3. Remove the `simulateDelay()` calls — the `apiClient` retry logic handles timing
4. Add documentation on how to add new endpoints with the wrapper

**Difficulty:** Intermediate | **Area:** API layer, Code quality

---

### Issue F7: `VerifyCertificate.tsx` Duplicates `window.alert()` Call in Share Handler

**File:** `src/pages/VerifyCertificate.tsx`

**Current Behavior:** The "Copy Link" button handler calls `window.alert('Link copied to clipboard!')` twice in succession:
```typescript
navigator.clipboard.writeText(url);
window.alert('Link copied to clipboard!');
window.alert('Link copied to clipboard!');
```

This creates a poor UX with two consecutive alert dialogs. Additionally, `window.alert` is a disruptive way to confirm clipboard operations — a brief inline toast or tooltip would be more appropriate.

**Expected Behavior:** Only one notification should be shown. A non-blocking toast notification should replace the `window.alert` calls.

**Suggested Approach:**
1. Remove the duplicate `window.alert`
2. Replace both `window.alert` calls with a toast notification (the component already imports `CheckCircle` from lucide and has a toast state)
3. Add a brief success animation on the button itself

**Difficulty:** Good first issue | **Area:** UX, VerifyCertificate

---

### Issue F8: `Dashboard.tsx` and `AdminAnalyticsDashboard.tsx` Mix Data Fetching with Rendering

**File:** `src/pages/Dashboard.tsx`, `src/pages/AdminAnalyticsDashboard.tsx`

**Current Behavior:** Both dashboard components fetch data directly inside the component body using `useEffect` + `useState`. This couples data fetching logic with presentation, making it impossible to test rendering without mocking the API at the module level. Components cannot be reused with different data sources.

**Expected Behavior:** Data fetching should be extracted into custom hooks or a data layer. Components should receive data via props or through a specialized data hook, making them testable with simple mock data.

**Suggested Approach:**
1. Create `useDashboardData()` and `useAdminAnalytics()` hooks
2. Move all `useEffect` + API call logic into the hooks
3. The hooks should return `{ data, loading, error, refetch }`
4. Components should render based on these three states
5. Add unit tests for the hooks with mocked API calls

**Difficulty:** Intermediate | **Area:** Architecture, Dashboard

---

### Issue F9: `Header.tsx` Has No Test Coverage for Role-Based Navigation

**File:** `src/components/Header.tsx`, `src/components/Header.test.tsx`

**Current Behavior:** The existing `Header.test.tsx` only tests mobile navigation drawer behavior. The header likely renders different navigation links based on user role (Admin, Issuer, Recipient, Verifier), but this is untested. Role-based navigation is a critical security and UX feature.

**Expected Behavior:** Tests should verify that:
1. An admin user sees admin-specific navigation items
2. A recipient user does not see admin items
3. An unauthenticated user sees only public links
4. Navigation links point to the correct routes

**Suggested Approach:**
1. Create a test helper that renders the header with a mocked `useAuth()` return value
2. Write tests for each user role
3. Test that protected links are absent for unauthorized roles
4. Test that clicking a navigation item calls `navigate()` with the correct path

**Difficulty:** Good first issue | **Area:** Testing, Auth

---

### Issue F10: No Environment Variable Validation at Startup

**File:** `src/utils/envValidation.ts`, `src/main.tsx`

**Current Behavior:** The frontend reads several environment variables (`VITE_API_URL`, `VITE_USE_DUMMY_DATA`, etc.) at runtime, but there's no validation that required variables are present when the app starts. Missing or malformed values (e.g., `VITE_API_URL` without protocol) cause cryptic failures later.

**Expected Behavior:** On app startup, all required environment variables should be validated. Missing variables should produce clear error messages. Optional variables should have documented defaults.

**Suggested Approach:**
1. Define a validation schema for all `VITE_*` variables
2. Run validation in `main.tsx` before rendering the app
3. For each variable, define: required/optional, type, acceptable values, default
4. Display a clear error overlay if validation fails (not a blank white screen)
5. Add tests for the validation logic

**Difficulty:** Good first issue | **Area:** Configuration, DX

---

## Stellar Contracts (`/stellar-contracts`) — 6 Issues

---

### Issue S1: `admin_multisig.rs` Panics on Missing State with `.expect()`

**Files:** `src/admin_multisig.rs`, `src/crl.rs`, `src/multisig.rs`

**Current Behavior:** Multiple files use `.expect()` on option/results, which causes a contract panic (and thus a failed Soroban transaction) when state is missing:
```rust
let proposal = self.proposals.get(&id).expect("Proposal not found");
let admin = self.admin.get().expect("Admin multisig not initialized");
```

Panics in Soroban are costly — they consume the entire gas budget and leave the contract state unchanged without a clear error message visible to the caller.

**Expected Behavior:** Contract functions should return typed errors (e.g., `SorobanError::NotFound`) instead of panicking. Callers should receive a meaningful error they can handle or display.

**Suggested Approach:**
1. Define a `ContractError` enum with variants like `NotFound`, `Unauthorized`, `AlreadyExists`
2. Replace `.expect()` with `ok_or(ContractError::NotFound)?`
3. Update all callers to propagate the error
4. Add tests that verify error returns instead of panics

**Difficulty:** Intermediate | **Area:** Error handling, Rust

---

### Issue S2: `crl.rs` Builds Merkle Root Using an Inefficient Pattern

**File:** `src/crl.rs`

**Current Behavior:** The Merkle root construction in `build_merkle_root()` builds the tree from individual certificate IDs by repeatedly hashing pairs. This approach is O(n log n) and uses multiple `env.crypto().sha256()` calls, which are expensive in Soroban (each crypto operation costs gas). For large CRLs (hundreds of certificates), this could exceed the contract's metering budget.

**Expected Behavior:** The Merkle root construction should batch operations where possible. Consider pre-computing the Merkle root off-chain and passing it as a parameter, with the contract only verifying inclusion proofs.

**Suggested Approach:**
1. Benchmark the current Merkle root construction with realistic CRL sizes
2. If gas costs are prohibitive, move root computation off-chain
3. The contract should accept a pre-computed root and only verify individual inclusion proofs (Merkle proofs) on-chain
4. Update tests to reflect the new API

**Difficulty:** Advanced | **Area:** Performance, CRL module

---

### Issue S3: `shadow.rs` Has No Unit Tests

**File:** `src/shadow.rs`

**Current Behavior:** The `shadow` module has no dedicated unit tests. Given that this module likely handles cross-contract calls or storage shadowing (a critical concern for contract correctness), the lack of tests is a risk. Buggy shadow logic could lead to inconsistent contract state.

**Expected Behavior:** The shadow module should have comprehensive unit tests covering:
1. Shadow state initialization
2. Read/write consistency between shadow and real storage
3. Edge cases: empty shadow, concurrent writes, TTL expiry
4. Gas cost comparison with direct storage access

**Suggested Approach:**
1. Add a `shadow_test.rs` file with the test module
2. Test each public function in `shadow.rs`
3. Use the Soroban test framework (`Env::default()`, `mock_all_auths()`)
4. Measure and document gas savings from shadowing

**Difficulty:** Intermediate | **Area:** Testing, Shadow module

---

### Issue S4: `storage.rs` and `storage_helpers.rs` Have Ambiguous Responsibility Boundaries

**Files:** `src/storage.rs`, `src/storage_helpers.rs`, `src/storage/mod.rs`, `src/storage/ttl.rs`

**Current Behavior:** Storage-related code is split across four files with unclear boundaries:
- `src/storage.rs` — top-level storage helpers
- `src/storage_helpers.rs` — additional helpers
- `src/storage/mod.rs` — module declaration
- `src/storage/ttl.rs` — TTL management

The naming is confusing — `storage.rs` and `storage_helpers.rs` could reasonably be expected to contain the same type of code. Contributors have difficulty knowing where to add new storage functionality.

**Expected Behavior:** A clear storage architecture should be documented and enforced:
- Data access functions grouped by entity (certificate, issuer, CRL, multisig)
- TTL management unified in the `storage/ttl.rs`
- No duplicate or overlapping helpers

**Suggested Approach:**
1. Audit the public API of both `storage.rs` and `storage_helpers.rs`
2. Merge them into a single `storage.rs` or clearly split by domain
3. Move all TTL-related code into `storage/ttl.rs`
4. Update all imports across the codebase
5. Add a README comment explaining the storage layer architecture

**Difficulty:** Good first issue | **Area:** Code organization, Rust

---

### Issue S5: `test.rs` and `test_backend.rs` Create Conflicting Test Namespaces

**Files:** `src/test.rs`, `src/test_backend.rs`, `src/comprehensive_tests.rs`, `src/issuer_test.rs`, `src/issuer_management_test.rs`

**Current Behavior:** The contracts test directory contains 10+ test files with overlapping concerns. Some tests are duplicated across files (e.g., issuer tests exist in both `issuer_test.rs` and `issuer_management_test.rs`). The `test.rs` and `test_backend.rs` files test similar functionality but with different test harness approaches, making it unclear which is canonical.

**Expected Behavior:** Tests should be organized by contract module, not by test harness. Each contract module (`certificate/`, `multisig/`, `crl/`) should have exactly one test file. Shared test utilities should be in a separate `test_helpers.rs` module.

**Suggested Approach:**
1. Identify all unique test cases across the 10+ files
2. Deduplicate overlapping tests
3. Organize by module: `certificate_test.rs`, `multisig_test.rs`, `crl_test.rs`, `storage_test.rs`
4. Extract shared setup helpers into `test_helpers.rs`
5. Remove the old test files once migration is complete

**Difficulty:** Intermediate | **Area:** Testing, Code organization

---

### Issue S6: `request_status/src/request.rs` Is Not Integrated into the Main Build

**File:** `stellar-contracts/src/request_status/`

**Current Behavior:** The `request_status` subdirectory contains its own `Cargo.toml` (implied by the `src/lib.rs` file), making it a separate crate. However, it's not referenced in the workspace `Cargo.toml` or imported by any other contract module. This code exists in the repository but is unused — it could be dead code that wastes contributor attention and CI resources.

**Expected Behavior:** Either the `request_status` crate should be:
1. Integrated into the main build as a workspace member and used by other modules, OR
2. Removed if the functionality is superseded by other modules

**Suggested Approach:**
1. Determine if `request.rs` contains functionality not present in the main contract
2. If it's redundant, remove the `request_status/` directory entirely
3. If it's needed, add it to the workspace `Cargo.toml` and integrate imports
4. Add tests that verify the functionality is exercised

**Difficulty:** Good first issue | **Area:** Build system, Dead code
