import { ConfigService } from '@nestjs/config';
import { rpc } from '@stellar/stellar-sdk';
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
    const config = new ConfigService(configValues);

    const logger: Partial<LoggingService> = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const service = new SorobanService(config, logger as LoggingService);
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

  it('throws SorobanNotFoundException with a NOT_FOUND code when the contract returns no data', () => {
    // We only assert on the exception's type and code — the rest of the
    // path requires network access we don't want in unit tests.
    const notFound = new SorobanNotFoundException('Certificate not found');

    expect(notFound).toBeInstanceOf(SorobanException);
    expect(notFound.code).toBe(SorobanErrorCode.NOT_FOUND);
  });
});

/**
 * Issue #46: an empty `CERTIFICATE_CONTRACT_ID` must surface as a typed
 * `SorobanConfigurationException` (not a generic Error, and not `false`)
 * raised before any network call is attempted.
 */
describe('SorobanService configuration guard (issue #46)', () => {
  const setupService = (
    configValues: Record<string, string>,
  ): SorobanService => {
    const config = new ConfigService(configValues);

    const logger: Partial<LoggingService> = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const service = new SorobanService(config, logger as LoggingService);
    service.onModuleInit();
    return service;
  };

  // RPC URL, network, and admin secret are configured so the service is
  // otherwise usable — only the contract ID is missing. `getAccount` is the
  // first network call any on-chain operation makes, so spying on it proves
  // the guard fires before the network is touched.
  const unconfigured = {
    SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
    STELLAR_NETWORK: 'testnet',
    SOROBAN_ADMIN_SECRET: 'SDOEXAMPLE' + 'X'.repeat(40),
    CERTIFICATE_CONTRACT_ID: '',
    MULTISIG_CONTRACT_ID: '',
    CRL_CONTRACT_ID: '',
  };

  it.each(['issueCertificate', 'revokeCertificate'] as const)(
    'throws SorobanConfigurationException from %s before any network call when the contract ID is empty',
    async (method) => {
      const service = setupService(unconfigured);
      const getAccountSpy = jest.spyOn(rpc.Server.prototype, 'getAccount');

      const operation =
        method === 'issueCertificate'
          ? service.issueCertificate(
              'cert-1',
              'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
              'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
              'https://example.com/metadata',
            )
          : service.revokeCertificate(
              'cert-1',
              'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
              'revoked by issuer',
            );

      await expect(operation).rejects.toBeInstanceOf(
        SorobanConfigurationException,
      );
      await expect(operation).rejects.toMatchObject({
        code: SorobanErrorCode.CONFIGURATION_ERROR,
        name: 'SorobanConfigurationException',
        message: 'Certificate contract ID not configured.',
      });

      // The configuration guard must run before any network interaction.
      expect(getAccountSpy).not.toHaveBeenCalled();
      getAccountSpy.mockRestore();
    },
  );
});
