import { ExceptionFilter, ArgumentsHost, HttpException } from '@nestjs/common';
import { SentryService } from '../monitoring/sentry.service';
import { LoggingService } from '../logging/logging.service';
export declare class HttpExceptionFilter implements ExceptionFilter {
    private sentryService?;
    private loggingService?;
    private readonly logger;
    constructor(sentryService?: SentryService | undefined, loggingService?: LoggingService | undefined);
    catch(exception: HttpException, host: ArgumentsHost): void;
}
