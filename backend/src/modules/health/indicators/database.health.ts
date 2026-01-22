import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(private readonly dataSource: DataSource) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      const isConnected = this.dataSource.isInitialized;
      
      if (!isConnected) {
        throw new Error('Database is not initialized');
      }

      // Attempt a simple query to verify database connectivity
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.query('SELECT 1');
      await queryRunner.release();

      this.logger.debug('Database health check passed');
      
      return this.getStatus('database', true, {
        message: 'Database connection is healthy',
      });
    } catch (error) {
      this.logger.error('Database health check failed', error);
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus('database', false, {
          message: error.message || 'Database is unavailable',
        }),
      );
    }
  }
}
