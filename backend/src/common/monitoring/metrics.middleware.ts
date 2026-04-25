import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../monitoring/metrics.service';
import { LoggingService } from "../logging/logging.service";

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private metricsService: MetricsService, private readonly logger: LoggingService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, path } = req;

    // Hook into response to capture metrics
    const originalSend = res.send;
    res.send = function (data: any) {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const status = res.statusCode;
      const metricsService = this.metricsService;
      const route = metricsService.normalizeRoute(path);

      // Record metrics
      metricsService.recordHttpRequestDuration(method, route, status, duration);

      if (status >= 400) {
        metricsService.recordHttpError(method, route, status);
      }

      return originalSend.call(this, data);
    }.bind({ metricsService: this.metricsService });

    next();
  }
}

// Add helper method to MetricsService to normalize routes
declare global {
  namespace Express {
    interface Application {
      _router?: any;
    }
  }
}
