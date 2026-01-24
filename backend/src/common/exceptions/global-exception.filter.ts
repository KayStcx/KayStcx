import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  HttpException,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SentryService } from '../monitoring/sentry.service';
import { LoggingService } from '../logging/logging.service';
import { AppException } from './exceptions';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(
    private sentryService: SentryService,
    private loggingService: LoggingService,
  ) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const context = (request as any).context;

    let statusCode = 500;
    let errorResponse: any = {
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    if (context?.correlationId) {
      errorResponse.correlationId = context.correlationId;
    }

    // Handle custom AppException
    if (exception instanceof AppException) {
      const appException = exception.getResponse() as any;
      statusCode = exception.getStatus();
      errorResponse = {
        ...appException,
        path: request.url,
        method: request.method,
      };
      if (context?.correlationId) {
        errorResponse.correlationId = context.correlationId;
      }
    }
    // Handle BadRequestException with validation errors
    else if (exception instanceof BadRequestException) {
      statusCode = 400;
      const exceptionResponse = exception.getResponse() as any;
      errorResponse = {
        errorCode: 'VALIDATION_ERROR',
        message: exceptionResponse.message || 'Validation failed',
        details: exceptionResponse.message,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      };
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
        message,
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
    if (statusCode >= 500) {
      this.loggingService.error(logMessage, exception, context);
      this.sentryService.captureException(exception, {
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
