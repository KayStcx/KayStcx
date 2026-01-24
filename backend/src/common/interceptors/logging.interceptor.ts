import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggingService } from '../logging/logging.service';

/**
 * Logging Interceptor
 * Logs incoming requests and outgoing responses with correlation IDs
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private loggingService: LoggingService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, body, query, params } = request;
    const context_obj = (request as any).context;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(
        (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.loggingService.log(
            `${method} ${url} - ${statusCode} (${duration}ms)`,
            {
              method,
              url,
              statusCode,
              duration,
              body: this.sanitizeBody(body),
              query,
              params,
              ...context_obj,
            },
          );
        },
        (error) => {
          const duration = Date.now() - startTime;
          this.loggingService.error(
            `${method} ${url} failed (${duration}ms)`,
            error,
            {
              method,
              url,
              duration,
              body: this.sanitizeBody(body),
              ...context_obj,
            },
          );
        },
      ),
    );
  }

  /**
   * Sanitize sensitive data from request body for logging
   */
  private sanitizeBody(body: any): any {
    if (!body) {
      return undefined;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
    const sanitized = { ...body };

    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        sanitized[field] = '***';
      }
    });

    return sanitized;
  }
}
