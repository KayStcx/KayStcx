"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var HttpExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const sentry_service_1 = require("../monitoring/sentry.service");
const logging_service_1 = require("../logging/logging.service");
let HttpExceptionFilter = HttpExceptionFilter_1 = class HttpExceptionFilter {
    sentryService;
    loggingService;
    logger = new common_1.Logger(HttpExceptionFilter_1.name);
    constructor(sentryService, loggingService) {
        this.sentryService = sentryService;
        this.loggingService = loggingService;
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception.getStatus();
        const context = request.context;
        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: exception.message,
            ...(context && { correlationId: context.correlationId }),
        };
        if (this.loggingService) {
            this.loggingService.error(`${request.method} ${request.url}`, new Error(exception.message), context);
        }
        else {
            this.logger.error(`${request.method} ${request.url}`, JSON.stringify(errorResponse), 'HttpExceptionFilter');
        }
        if (this.sentryService && status >= 500) {
            this.sentryService.captureException(exception, {
                url: request.url,
                method: request.method,
                statusCode: status,
                ...context,
            });
        }
        response.status(status).json(errorResponse);
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = HttpExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(common_1.HttpException),
    __param(0, (0, common_1.Optional)()),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [sentry_service_1.SentryService,
        logging_service_1.LoggingService])
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map