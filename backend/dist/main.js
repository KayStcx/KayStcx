"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const validation_pipe_1 = require("./common/pipes/validation.pipe");
const global_exception_filter_1 = require("./common/exceptions/global-exception.filter");
const app_module_1 = require("./app.module");
const swagger_1 = require("@nestjs/swagger");
const sentry_service_1 = require("./common/monitoring/sentry.service");
const logging_service_1 = require("./common/logging/logging.service");
const monitoring_interceptor_1 = require("./common/monitoring/monitoring.interceptor");
const metrics_service_1 = require("./common/monitoring/metrics.service");
const Sentry = __importStar(require("@sentry/node"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const sentryService = app.get(sentry_service_1.SentryService);
    const loggingService = app.get(logging_service_1.LoggingService);
    const metricsService = app.get(metrics_service_1.MetricsService);
    app.enableCors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
        credentials: true,
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new validation_pipe_1.ValidationPipe());
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter(sentryService, loggingService));
    if (sentryService.isInitialized()) {
        app.use(Sentry.Handlers.requestHandler());
    }
    app.useGlobalInterceptors(new monitoring_interceptor_1.MonitoringInterceptor(metricsService, sentryService, loggingService));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Kaystcx API')
        .setDescription('Certificate Management System API Documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    if (sentryService.isInitialized()) {
        app.use(Sentry.Handlers.errorHandler());
    }
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    loggingService.log(`Application started on port ${port}`);
}
bootstrap();
bootstrap();
//# sourceMappingURL=main.js.map