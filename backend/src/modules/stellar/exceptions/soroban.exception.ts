/**
 * Typed exceptions for Soroban contract operations.
 *
 * `SorobanService` previously returned `false` / `null` on every failure,
 * which hid the failure mode from callers. These exceptions replace those
 * boolean returns so callers can distinguish between configuration errors,
 * network/RPC failures, and on-chain transaction failures.
 */
export enum SorobanErrorCode {
  CONFIGURATION_ERROR = 'SOROBAN_CONFIGURATION_ERROR',
  NETWORK_ERROR = 'SOROBAN_NETWORK_ERROR',
  TRANSACTION_ERROR = 'SOROBAN_TRANSACTION_ERROR',
  NOT_FOUND = 'SOROBAN_NOT_FOUND',
}

export class SorobanException extends Error {
  public readonly code: SorobanErrorCode;
  public readonly originalError?: unknown;

  constructor(
    message: string,
    code: SorobanErrorCode,
    originalError?: unknown,
  ) {
    super(message);
    this.name = 'SorobanException';
    this.code = code;
    this.originalError = originalError;
  }
}

/**
 * Thrown when the Soroban service or a contract is not properly configured
 * (missing RPC URL, admin secret, or contract IDs).
 */
export class SorobanConfigurationException extends SorobanException {
  constructor(message: string, originalError?: unknown) {
    super(message, SorobanErrorCode.CONFIGURATION_ERROR, originalError);
    this.name = 'SorobanConfigurationException';
  }
}

/**
 * Thrown when the Soroban RPC server cannot be reached or a request fails at
 * the network/transport level.
 */
export class SorobanNetworkException extends SorobanException {
  constructor(message: string, originalError?: unknown) {
    super(message, SorobanErrorCode.NETWORK_ERROR, originalError);
    this.name = 'SorobanNetworkException';
  }
}

/**
 * Thrown when a transaction is submitted but does not succeed on-chain.
 */
export class SorobanTransactionException extends SorobanException {
  constructor(message: string, originalError?: unknown) {
    super(message, SorobanErrorCode.TRANSACTION_ERROR, originalError);
    this.name = 'SorobanTransactionException';
  }
}

/**
 * Thrown when a requested contract record does not exist.
 */
export class SorobanNotFoundException extends SorobanException {
  constructor(message: string, originalError?: unknown) {
    super(message, SorobanErrorCode.NOT_FOUND, originalError);
    this.name = 'SorobanNotFoundException';
  }
}
