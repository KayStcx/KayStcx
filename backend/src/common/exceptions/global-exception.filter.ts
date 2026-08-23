import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SentryService } from '../monitoring/sentry.service';
import { LoggingService } from '../logging/logging.service';
import { AppException } from './exceptions';
import {
  SorobanException,
  SorobanConfigurationException,
  SorobanNetworkException,
  SorobanNotFoundException,
  SorobanTransactionException,
  SorobanErrorCode,
} from '../../modules/stellar/exceptions/soroban.exception';

/**
 * HTTP status mapping for each `SorobanErrorCode`. Kept in this file so the
 * HTTP layer is the only place that decides what a Soroban failure looks
 * like to clients (issue #8 / backend "B10").
 *
 * - Configuration issues are server-side misconfigurations → 500.
 * - Network / transaction failures are upstream RPC failures → 502
 *   ("Bad Gateway") so the caller can retry without rebuilding the request.
 * - Not-found is a regular 404.
 */
const SOROBAN_HTTP_STATUS: Record<SorobanErrorCode, number> = {
  [SorobanErrorCode.CONFIGURATION_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [SorobanErrorCode.NETWORK_ERROR]: HttpStatus.BAD_GATEWAY,
  [SorobanErrorCode.TRANSACTION_ERROR]: HttpStatus.BAD_GATEWAY,
  [SorobanErrorCode.NOT_FOUND]: HttpStatus.NOT_FOUND,
};

interface ErrorResponse {
  errorCode: string;
  message: string;
  timestamp: string;
  path: string;
  method: string;
  correlationId?: string;
  details?: unknown;
  stack?: string;
}

interface RequestWithContext extends Request {
  context?: {
    correlationId?: string;
  };
}

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private isProduction: boolean;

  constructor(
    private configService: ConfigService,
    private sentryService: SentryService,
    private loggingService: LoggingService,
  ) {
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext>();
    const context = request.context;

    let statusCode = 500;
    let errorResponse: ErrorResponse = {
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    if (context?.correlationId) {
      errorResponse.correlationId = context.correlationId;
    }

    // Handle typed Soroban exceptions (#8 / backend "B10") before the
    // generic AppException / HttpException branches so the response uses
    // their stable `errorCode` field and the right HTTP status.
    if (exception instanceof SorobanException) {
      const sorobanException = exception;
      statusCode = SOROBAN_HTTP_STATUS[sorobanException.code] ?? 500;
      errorResponse = {
        errorCode: sorobanException.code,
        message: sorobanException.message,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      };

      if (context?.correlationId) {
        errorResponse.correlationId = context.correlationId;
      }
      // Original-error `details` are intentionally not echoed to clients:
      // the upstream SDK / network message is unlikely to be useful and may
      // leak internal state. Tests assert the stable B10 codes instead.
    }
    // Handle custom AppException
    else if (exception instanceof AppException) {
      statusCode = exception.getStatus();
      const appResponse = exception.getResponse();
      const appData =
        typeof appResponse === 'object' && appResponse !== null
          ? (appResponse as Record<string, unknown>)
          : { message: String(appResponse) };

      // Map only the known, validated fields onto the error response instead of
      // spreading the exception response verbatim (which could leak internal
      // state or return malformed shapes).
      errorResponse = {
        errorCode:
          typeof appData.errorCode === 'string'
            ? appData.errorCode
            : 'INTERNAL_SERVER_ERROR',
        message:
          typeof appData.message === 'string'
            ? appData.message
            : 'Internal server error',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      };

      if (context?.correlationId) {
        errorResponse.correlationId = context.correlationId;
      }

      // Only surface `details` in non-production, and never leak a stack trace.
      if (!this.isProduction && appData.details !== undefined) {
        errorResponse.details = appData.details;
      }
    }
    // Handle BadRequestException with validation errors
    else if (exception instanceof BadRequestException) {
      statusCode = 400;
      const exceptionResponse = exception.getResponse() as Record<
        string,
        unknown
      >;
      errorResponse = {
        errorCode: 'VALIDATION_ERROR',
        message: (exceptionResponse.message as string) || 'Validation failed',
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      };
      // Only include details in non-production environments
      if (!this.isProduction) {
        errorResponse.details = exceptionResponse.message;
      }
      if (context?.correlationId) {
        errorResponse.correlationId = context.correlationId;
      }
    }
    // Handle HttpException
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      errorResponse = {
        errorCode: 'HTTP_ERROR',
        message: exception.message,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      };
      if (context?.correlationId) {
        errorResponse.correlationId = context.correlationId;
      }
    }
    // Handle all other exceptions
    else {
      statusCode = 500;
      const message =
        exception instanceof Error ? exception.message : String(exception);
      errorResponse = {
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: this.isProduction ? 'Internal server error' : message,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      };
      if (context?.correlationId) {
        errorResponse.correlationId = context.correlationId;
      }
    }

    // Log error
    const logMessage = `${request.method} ${request.url} - ${statusCode}`;
    const error =
      exception instanceof Error ? exception : new Error(String(exception));

    if (statusCode >= 500) {
      this.loggingService.error(logMessage, error, context);
      this.sentryService.captureException(error, {
        url: request.url,
        method: request.method,
        statusCode,
        ...context,
      });
    } else {
      this.loggingService.warn(logMessage, context);
    }

    response.status(statusCode).json(errorResponse);
  }
}
