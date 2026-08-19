import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import {
  ConflictException,
  NotFoundException,
  ValidationException,
} from './exceptions';
import { ErrorCode } from '../constants/error-codes';
import {
  SorobanConfigurationException,
  SorobanErrorCode,
  SorobanNetworkException,
  SorobanNotFoundException,
  SorobanTransactionException,
} from '../../modules/stellar/exceptions/soroban.exception';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let configService: { get: jest.Mock };
  let sentryService: { captureException: jest.Mock };
  let loggingService: { error: jest.Mock; warn: jest.Mock };

  const createHost = () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const request = {
      url: '/api/test',
      method: 'GET',
      context: { correlationId: 'corr-123' },
    };
    return {
      host: {
        switchToHttp: () => ({
          getResponse: () => response,
          getRequest: () => request,
        }),
      } as any,
      response,
    };
  };

  const createFilter = (env: string = 'development') => {
    configService = { get: jest.fn().mockReturnValue(env) };
    sentryService = { captureException: jest.fn() };
    loggingService = { error: jest.fn(), warn: jest.fn() };
    filter = new GlobalExceptionFilter(
      configService as any,
      sentryService as any,
      loggingService as any,
    );
  };

  beforeEach(() => {
    createFilter();
  });

  describe('AppException handling', () => {
    it('maps known fields explicitly and strips unknown top-level properties', () => {
      const { host, response } = createHost();
      const exception = new ConflictException('Resource conflict', {
        internal: 'secret',
      });

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      const body = response.json.mock.calls[0][0];
      expect(body).toEqual(
        expect.objectContaining({
          errorCode: ErrorCode.CONFLICT,
          message: 'Resource conflict',
          path: '/api/test',
          method: 'GET',
          correlationId: 'corr-123',
          timestamp: expect.any(String),
        }),
      );
      // The unknown property must not be leaked to the top level
      expect(body).not.toHaveProperty('internal');
    });

    it('preserves errorCode and message from the exception response', () => {
      const { host, response } = createHost();
      const exception = new NotFoundException('Certificate not found');

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      const body = response.json.mock.calls[0][0];
      expect(body.errorCode).toBe(ErrorCode.NOT_FOUND);
      expect(body.message).toBe('Certificate not found');
      expect(body).not.toHaveProperty('stack');
    });

    it('includes details in non-production environments', () => {
      const { host, response } = createHost();
      const exception = new ValidationException('Invalid input', {
        field: 'email',
      });

      filter.catch(exception, host);

      const body = response.json.mock.calls[0][0];
      expect(body.details).toEqual({ field: 'email' });
    });

    it('strips details in production', () => {
      createFilter('production');
      const { host, response } = createHost();
      const exception = new ValidationException('Invalid input', {
        field: 'email',
      });

      filter.catch(exception, host);

      const body = response.json.mock.calls[0][0];
      expect(body).not.toHaveProperty('details');
    });
  });

  describe('BadRequestException handling', () => {
    it('returns a VALIDATION_ERROR response with details in development', () => {
      const { host, response } = createHost();
      const exception = new BadRequestException(['email must be an email']);

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      const body = response.json.mock.calls[0][0];
      expect(body.errorCode).toBe('VALIDATION_ERROR');
      expect(body.details).toEqual(['email must be an email']);
    });

    it('strips details in production', () => {
      createFilter('production');
      const { host, response } = createHost();
      const exception = new BadRequestException(['email must be an email']);

      filter.catch(exception, host);

      const body = response.json.mock.calls[0][0];
      expect(body).not.toHaveProperty('details');
    });
  });

  describe('HttpException handling', () => {
    it('returns an HTTP_ERROR response', () => {
      const { host, response } = createHost();
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      const body = response.json.mock.calls[0][0];
      expect(body.errorCode).toBe('HTTP_ERROR');
      expect(body.message).toBe('Forbidden');
      expect(body).not.toHaveProperty('details');
      expect(body).not.toHaveProperty('stack');
    });
  });

  describe('Unknown exception handling', () => {
    it('returns a generic message in production', () => {
      createFilter('production');
      const { host, response } = createHost();

      filter.catch(new Error('secret internal detail'), host);

      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      const body = response.json.mock.calls[0][0];
      expect(body.errorCode).toBe('INTERNAL_SERVER_ERROR');
      expect(body.message).toBe('Internal server error');
      expect(sentryService.captureException).toHaveBeenCalled();
    });

    it('exposes the error message in non-production environments', () => {
      const { host, response } = createHost();

      filter.catch(new Error('debug detail'), host);

      const body = response.json.mock.calls[0][0];
      expect(body.message).toBe('debug detail');
    });
  });

  // Issue #8 / backend "B10": the global filter must surface the typed
  // Soroban exceptions with the correct HTTP status instead of falling
  // through to the generic INTERNAL_SERVER_ERROR branch.
  describe('SorobanException handling', () => {
    it('maps SorobanConfigurationException to 500 with the typed code', () => {
      const { host, response } = createHost();
      const exception = new SorobanConfigurationException(
        'Admin keypair not configured.',
      );

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      const body = response.json.mock.calls[0][0];
      expect(body.errorCode).toBe(SorobanErrorCode.CONFIGURATION_ERROR);
      expect(body.errorCode).toBe(ErrorCode.SOROBAN_CONFIGURATION_ERROR);
      expect(body.message).toBe('Admin keypair not configured.');
    });

    it('maps SorobanNetworkException to 502', () => {
      const { host, response } = createHost();
      filter.catch(
        new SorobanNetworkException('RPC unreachable', new Error('ETIMEDOUT')),
        host,
      );

      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
      const body = response.json.mock.calls[0][0];
      expect(body.errorCode).toBe(SorobanErrorCode.NETWORK_ERROR);
    });

    it('maps SorobanTransactionException to 502', () => {
      const { host, response } = createHost();
      filter.catch(new SorobanTransactionException('Transaction failed'), host);

      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
      const body = response.json.mock.calls[0][0];
      expect(body.errorCode).toBe(SorobanErrorCode.TRANSACTION_ERROR);
    });

    it('maps SorobanNotFoundException to 404', () => {
      const { host, response } = createHost();
      filter.catch(new SorobanNotFoundException('Certificate not found'), host);

      expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      const body = response.json.mock.calls[0][0];
      expect(body.errorCode).toBe(SorobanErrorCode.NOT_FOUND);
    });

    it('does not leak the originalError attached to a Soroban exception', () => {
      const { host, response } = createHost();
      const upstream = new Error('top-secret internal stack');
      filter.catch(
        new SorobanNetworkException('RPC unreachable', upstream),
        host,
      );

      const body = response.json.mock.calls[0][0];
      expect(body).not.toHaveProperty('details');
      expect(body).not.toHaveProperty('originalError');
      // Make sure the upstream SDK message never reaches the response body.
      expect(JSON.stringify(body)).not.toContain('top-secret internal stack');
    });
  });
});
