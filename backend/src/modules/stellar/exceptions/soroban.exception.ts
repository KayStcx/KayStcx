import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception for all Soroban/Stellar failures.
 *
 * Replaces the previous pattern of logging and returning `false`/`null` so
 * callers can distinguish between configuration problems, network timeouts,
 * and on-chain transaction failures.
 */
export class SorobanException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_GATEWAY,
    errorCode = 'SOROBAN_ERROR',
  ) {
    super({ errorCode, message }, status);
  }
}

/** Soroban is not configured (missing RPC URL / admin key / contract IDs). */
export class SorobanConfigurationException extends SorobanException {
  constructor(message: string) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE, 'SOROBAN_NOT_CONFIGURED');
  }
}

/** A network/RPC failure while talking to the Soroban RPC server. */
export class SorobanNetworkException extends SorobanException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_GATEWAY, 'SOROBAN_NETWORK_ERROR');
  }
}

/** A transaction was submitted but failed on-chain. */
export class SorobanTransactionException extends SorobanException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_GATEWAY, 'SOROBAN_TRANSACTION_FAILED');
  }
}

/** The requested on-chain record does not exist. */
export class SorobanNotFoundException extends SorobanException {
  constructor(message: string) {
    super(message, HttpStatus.NOT_FOUND, 'SOROBAN_NOT_FOUND');
  }
}
