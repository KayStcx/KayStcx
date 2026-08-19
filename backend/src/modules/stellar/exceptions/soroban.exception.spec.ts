import {
  SorobanConfigurationException,
  SorobanErrorCode,
  SorobanException,
  SorobanNetworkException,
  SorobanNotFoundException,
  SorobanTransactionException,
} from './soroban.exception';

describe('SorobanException hierarchy', () => {
  describe('SorobanException base class', () => {
    it('stores the message, code and original error on the instance', () => {
      const cause = new Error('upstream timeout');
      const exception = new SorobanException(
        'Generic failure',
        SorobanErrorCode.NETWORK_ERROR,
        cause,
      );

      expect(exception).toBeInstanceOf(Error);
      expect(exception).toBeInstanceOf(SorobanException);
      expect(exception.message).toBe('Generic failure');
      expect(exception.code).toBe(SorobanErrorCode.NETWORK_ERROR);
      expect(exception.originalError).toBe(cause);
      expect(exception.name).toBe('SorobanException');
    });

    it('treats the originalError argument as optional', () => {
      const exception = new SorobanException(
        'No cause',
        SorobanErrorCode.CONFIGURATION_ERROR,
      );

      expect(exception.originalError).toBeUndefined();
    });
  });

  describe('SorobanConfigurationException', () => {
    it('is a SorobanException with a CONFIGURATION_ERROR code', () => {
      const exception = new SorobanConfigurationException(
        'Admin keypair not configured.',
      );

      expect(exception).toBeInstanceOf(SorobanException);
      expect(exception).toBeInstanceOf(SorobanConfigurationException);
      expect(exception.code).toBe(SorobanErrorCode.CONFIGURATION_ERROR);
      expect(exception.name).toBe('SorobanConfigurationException');
      expect(exception.message).toBe('Admin keypair not configured.');
    });
  });

  describe('SorobanNetworkException', () => {
    it('is a SorobanException with a NETWORK_ERROR code', () => {
      const cause = new Error('ECONNREFUSED');
      const exception = new SorobanNetworkException(
        'Failed to reach Soroban RPC',
        cause,
      );

      expect(exception).toBeInstanceOf(SorobanException);
      expect(exception).toBeInstanceOf(SorobanNetworkException);
      expect(exception.code).toBe(SorobanErrorCode.NETWORK_ERROR);
      expect(exception.name).toBe('SorobanNetworkException');
      expect(exception.originalError).toBe(cause);
    });
  });

  describe('SorobanTransactionException', () => {
    it('is a SorobanException with a TRANSACTION_ERROR code', () => {
      const exception = new SorobanTransactionException(
        'Transaction failed (status: FAILED)',
      );

      expect(exception).toBeInstanceOf(SorobanException);
      expect(exception).toBeInstanceOf(SorobanTransactionException);
      expect(exception.code).toBe(SorobanErrorCode.TRANSACTION_ERROR);
      expect(exception.name).toBe('SorobanTransactionException');
    });
  });

  describe('SorobanNotFoundException', () => {
    it('is a SorobanException with a NOT_FOUND code', () => {
      const exception = new SorobanNotFoundException('Certificate not found');

      expect(exception).toBeInstanceOf(SorobanException);
      expect(exception).toBeInstanceOf(SorobanNotFoundException);
      expect(exception.code).toBe(SorobanErrorCode.NOT_FOUND);
      expect(exception.name).toBe('SorobanNotFoundException');
    });
  });

  it('still allows callers to distinguish failure modes via instanceof', () => {
    const config = new SorobanConfigurationException('cfg');
    const network = new SorobanNetworkException('net');
    const tx = new SorobanTransactionException('tx');
    const nf = new SorobanNotFoundException('nf');

    expect(config).toBeInstanceOf(SorobanException);
    expect(network).toBeInstanceOf(SorobanException);
    expect(tx).toBeInstanceOf(SorobanException);
    expect(nf).toBeInstanceOf(SorobanException);

    // Cross-class negatives guard against accidental base-class pollution.
    expect(config).not.toBeInstanceOf(SorobanNetworkException);
    expect(network).not.toBeInstanceOf(SorobanConfigurationException);
    expect(tx).not.toBeInstanceOf(SorobanNotFoundException);
    expect(nf).not.toBeInstanceOf(SorobanTransactionException);
  });
});
