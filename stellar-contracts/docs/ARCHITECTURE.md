# Stellar Contracts — Architecture Notes

This crate (`certificate-revocation`) is a `#![no_std]` Soroban contract suite. It
builds as a `cdylib` + `rlib` with `lib.rs` as the single entry point.

## Module layout

Only these modules are compiled (declared in `src/lib.rs`):

| File | Contents |
| --- | --- |
| `types.rs` | Shared `#[contracttype]` types, `DataKey`, and the `ContractError` enum |
| `lib.rs` | `CertificateContract` — issuance, revocation, transfer, batch verification |
| `multisig.rs` | `MultisigCertificateContract` — issuer-level multisig approval flows |
| `crl.rs` | `CRLContract` — certificate revocation list + Merkle root |
| `admin_multisig.rs` | `AdminMultisigContract` — admin-governed actions (upgrade, remove issuer) |

Anything not declared in `lib.rs` is **not compiled**. The following stale modules
were removed because they were unreferenced, duplicated active logic, or used the
deprecated `env.storage().set()` / `extend_ttl` APIs:

- `request_status/`, `request/`, `certificate/` — superseded by `multisig.rs`
- `storage.rs`, `storage_helpers.rs`, `storage/` — superseded by `types.rs::DataKey`
- `shadow.rs`, `metadata.rs` — unused metadata-schema drafts
- `auto.rs` — verbatim duplicate of `admin_multisig.rs`
- orphaned test files (`test.rs`, `test_backend.rs`, `comprehensive_tests.rs`,
  `issuer_management_test.rs`, `metadata_test.rs`)

## Storage architecture

- **`types.rs::DataKey`** is the single source of truth for `CertificateContract`
  and `MultisigCertificateContract` keys (certificates, issuers, transfers, pending
  requests, contract version).
- `CRLContract` and `AdminMultisigContract` each define a **private, module-local**
  `DataKey`/`AdminMultisigDataKey` enum so their storage layout cannot be confused
  with the main contract's.
- TTL management: Soroban SDK 21 removed the standalone `extend_ttl` helper; extend
  instance/persistent lifetimes with `env.storage().instance().extend_ttl(...)` /
  `.persistent().extend_ttl(...)` at the call site.

When adding storage, add the key to the owning module's `DataKey` enum — do not
introduce a new top-level `storage*` file.

## Testing

One `*_test.rs` file per module, declared behind `#[cfg(test)]` in `lib.rs`:

- `admin_multisig_test.rs`
- `crl_test.rs`
- `multisig_test.rs`
- `issuer_test.rs`
- `status_test.rs`

Shared setup code (e.g. registering + initializing the `CertificateContract`) lives
in `test_helpers.rs`, also declared behind `#[cfg(test)]`.

Tests use the Soroban test framework (`Env::default()`, `env.mock_all_auths()`,
generated `*ContractClient`).

## Error handling

Contract methods that can fail on *expected* conditions return
`Result<T, ContractError>` (see `types.rs`). `ContractError` is a `#[contracterror]`
enum with variants for `NotInitialized`, `NotFound`, `Unauthorized`, `AlreadyExists`,
`InvalidState`, and `InvalidConfig`.

Guidelines:

- Prefer `storage.get(&key).ok_or(ContractError::NotFound)?` over `.expect(...)`.
- Prefer `return Err(ContractError::Unauthorized)` over `panic!("not allowed")`.
- `require_auth()` still aborts on auth failure (idiomatic Soroban); it is not
  mapped to `ContractError`.
- `CertificateContract` (in `lib.rs`) still uses `panic!`/`.expect()` for expected
  failures. Converting it to `Result<T, ContractError>` is a **breaking ABI change**
  for deployed clients and the backend integrator, so it is intentionally deferred;
  migrate it in a follow-up that also updates `backend/.../soroban.service.ts`.

### Generated clients

For a method returning `Result<T, ContractError>`, the `#[contractimpl]` macro
generates two client methods: `foo(...) -> T` (unwraps, panics on error) and
`try_foo(...) -> Result<T, _>`. Use `try_*` in tests to assert error paths:

```rust
assert!(client.try_revoke_certificate(&issuer, &id, &reason, &None).is_err());
```

## CRL Merkle root

`crl.rs::build_merkle_root` recomputes the whole tree on-chain (one `sha256` per
leaf plus one per internal node, i.e. O(n) crypto ops). For large CRLs this can
approach the metering budget, so the contract also supports an off-chain scaling
path:

1. Compute the Merkle root **off-chain** from the revoked-ID set.
2. Have the issuer publish the pre-computed root via `publish_merkle_root`.
3. Verify **individual inclusion proofs** on-chain with `verify_merkle_proof`
   (O(log n) crypto ops) instead of rebuilding the tree.

`build_merkle_root` remains correct and deterministic for small/medium CRLs and is
still used to keep the published root fresh on revocations; large CRLs should
migrate to off-chain roots.
