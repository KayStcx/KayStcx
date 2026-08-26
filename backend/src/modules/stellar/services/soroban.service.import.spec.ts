// Mock the Stellar SDK for the behavioral specs below: the service's
// onModuleInit() path only touches rpc.Server / Networks / Keypair, so a
// full fake is enough and keeps the suite free of network access.
jest.mock('@stellar/stellar-sdk', () => {
  const server = jest.fn();
  return {
    rpc: {
      Server: server,
      Api: {
        GetTransactionStatus: {
          SUCCESS: 'SUCCESS',
          FAILED: 'FAILED',
          NOT_FOUND: 'NOT_FOUND',
        },
      },
    },
    Contract: jest.fn(),
    TransactionBuilder: jest.fn(),
    Networks: {
      TESTNET: 'Test SDF Network ; September 2015',
      PUBLIC: 'Public Global Stellar Network ; September 2015',
    },
    Keypair: {
      fromSecret: jest.fn(() => ({
        publicKey: () => 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      })),
    },
    Address: { fromString: jest.fn() },
    Account: jest.fn(),
    Transaction: jest.fn(),
    nativeToScVal: jest.fn(),
    scValToNative: jest.fn(),
  };
});

import { readFileSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import * as StellarSdk from '@stellar/stellar-sdk';
import { SorobanService } from './soroban.service';
import { LoggingService } from '../../../common/logging/logging.service';

/**
 * Issue #47 (backend "stellar"): the Soroban RPC server used to be created
 * with a dynamic `new (require('@stellar/stellar-sdk').rpc.Server)(...)`,
 * which bypassed TypeScript module resolution and silently returned
 * `undefined` if the module failed to load. The fix moved to a static
 * named import (`rpc` from `@stellar/stellar-sdk`) and narrowed every
 * `catch (error: any)` to `catch (error: unknown)`. These specs pin that
 * contract so a regression — a `require()` creeping back in, or an
 * untyped catch — is caught by CI without needing a live Soroban RPC.
 */

// The static-source checks read the service file itself, so they guard the
// *source text* (a dynamic require could still type-check and would not be
// caught by the behavioral tests alone).
const SERVICE_SOURCE_PATH = join(__dirname, 'soroban.service.ts');
const readServiceSource = (): string =>
  readFileSync(SERVICE_SOURCE_PATH, 'utf8');

describe('SorobanService static import contract (issue #47)', () => {
  it('contains no dynamic require() call', () => {
    const source = readServiceSource();
    expect(source).not.toMatch(/require\s*\(/);
  });

  it('imports rpc as a named import from @stellar/stellar-sdk', () => {
    const source = readServiceSource();
    expect(source).toMatch(
      /import\s*\{[\s\S]*?\brpc\b[\s\S]*?\}\s*from\s*['"]@stellar\/stellar-sdk['"]/,
    );
  });

  it('constructs the RPC server via new rpc.Server(...)', () => {
    const source = readServiceSource();
    expect(source).toMatch(/new\s+rpc\.Server\s*\(/);
  });

  it('never catches with an untyped (error: any) signature', () => {
    const source = readServiceSource();
    expect(source).not.toMatch(/catch\s*\(\s*error\s*:\s*any\s*\)/);
  });
});

describe('SorobanService RPC server construction (issue #47)', () => {
  const setupService = (
    configValues: Record<string, string>,
  ): SorobanService => {
    const config = {
      get: jest.fn((key: string) => configValues[key]),
    } as unknown as ConfigService;

    const logger: Partial<LoggingService> = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const service = new SorobanService(
      config as ConfigService,
      logger as LoggingService,
    );
    service.onModuleInit();
    return service;
  };

  const serverConstructor = (): jest.Mock =>
    (StellarSdk as unknown as { rpc: { Server: jest.Mock } }).rpc.Server;

  it('constructs rpc.Server through the static import, with allowHttp for localhost URLs', () => {
    setupService({
      SOROBAN_RPC_URL: 'http://localhost:8000',
      STELLAR_NETWORK: 'testnet',
      SOROBAN_ADMIN_SECRET: `S${'A'.repeat(55)}`,
      CERTIFICATE_CONTRACT_ID: 'C',
      MULTISIG_CONTRACT_ID: 'M',
      CRL_CONTRACT_ID: 'R',
    });

    expect(serverConstructor()).toHaveBeenCalledTimes(1);
    expect(serverConstructor()).toHaveBeenCalledWith('http://localhost:8000', {
      allowHttp: true,
    });
  });

  it('disables allowHttp for non-localhost RPC URLs', () => {
    setupService({
      SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
      STELLAR_NETWORK: 'testnet',
      SOROBAN_ADMIN_SECRET: `S${'A'.repeat(55)}`,
      CERTIFICATE_CONTRACT_ID: 'C',
      MULTISIG_CONTRACT_ID: 'M',
      CRL_CONTRACT_ID: 'R',
    });

    expect(serverConstructor()).toHaveBeenLastCalledWith(
      'https://soroban-testnet.stellar.org',
      { allowHttp: false },
    );
  });
});
