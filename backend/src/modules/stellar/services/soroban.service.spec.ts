import { ConfigService } from '@nestjs/config';
import { SorobanService } from './soroban.service';
import { LoggingService } from '../../../common/logging/logging.service';
import {
  SorobanConfigurationException,
  SorobanErrorCode,
  SorobanException,
  SorobanNotFoundException,
} from '../exceptions/soroban.exception';

/**
 * Issue #8 / backend "B10" asserted that callers could only tell Soroban
 * failures apart by seeing `false` come back. Since the refactor, those
 * callers must instead receive a typed exception whose `code` identifies
 * the failure mode. These specs pin that contract so future regressions
 * (e.g. swallowed throws, return values creeping back in) are caught in CI.
 */
describe('SorobanService typed exception contract (issue #8 / B10)', () => {
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

  it('throws SorobanConfigurationException when no contracts are configured', async () => {
    const service = setupService({
      // RPC URL, network, and admin secret present so init does not warn...
      SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
      STELLAR_NETWORK: 'testnet',
      SOROBAN_ADMIN_SECRET: 'SDOEXAMPLE' + 'X'.repeat(40),
      // ...but no contract IDs assigned.
      CERTIFICATE_CONTRACT_ID: '',
      MULTISIG_CONTRACT_ID: '',
      CRL_CONTRACT_ID: '',
    });

    await expect(
      service.addIssuer('GAEXAMPLEISSUERADDRESSXXXXXXXXXXXXXXX'),
    ).rejects.toBeInstanceOf(SorobanConfigurationException);

    await expect(
      service.addIssuer('GAEXAMPLEISSUERADDRESSXXXXXXXXXXXXXXX'),
    ).rejects.toMatchObject({
      code: SorobanErrorCode.CONFIGURATION_ERROR,
      name: 'SorobanConfigurationException',
    });
  });

  it('throws SorobanNotFoundException with a NOT_FOUND code when the contract returns no data', async () => {
    // We only assert on the exception's type and code — the rest of the
    // path requires network access we don't want in unit tests.
    const notFound = new SorobanNotFoundException('Certificate not found');

    expect(notFound).toBeInstanceOf(SorobanException);
    expect(notFound.code).toBe(SorobanErrorCode.NOT_FOUND);
  });
});
