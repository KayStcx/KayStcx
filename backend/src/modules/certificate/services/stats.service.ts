import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Certificate } from '../entities/certificate.entity';
import { StatsQueryDto, CertificateStatsDto } from '../dto/stats.dto';
import { Verification } from '../entities/verification.entity';
import { settlePromise } from '../../../common/utils/promise.utils';

@Injectable()
export class CertificateStatsService {
  private readonly CACHE_TTL = 300; // 5 minutes in seconds
  private readonly logger = new Logger(CertificateStatsService.name);

  constructor(
    @InjectRepository(Certificate)
    private certificateRepo: Repository<Certificate>,
    @InjectRepository(Verification)
    private verificationRepo: Repository<Verification>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async getStatistics(query: StatsQueryDto): Promise<CertificateStatsDto> {
    const cacheKey = this.generateCacheKey(query);

    // Try to get from cache
    const cached = await this.cacheManager.get<CertificateStatsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build date range filter
    const dateFilter = this.buildDateFilter(query);
    const issuerFilter = query.issuerId ? { issuerId: query.issuerId } : {};

    // Fetch all statistics in parallel. Sub-queries are isolated so a single
    // failure returns a safe default rather than breaking the whole response.
    const onError = (label: string) => (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Certificate stats sub-query failed (${label}): ${message}`);
    };

    const [totalStats, issuanceTrend, topIssuers, verificationStats] =
      await Promise.all([
        settlePromise(this.getTotalStats(dateFilter, issuerFilter), { totalCertificates: 0, activeCertificates: 0, revokedCertificates: 0, expiredCertificates: 0 }, onError('totalStats')),
        settlePromise(this.getIssuanceTrend(dateFilter, issuerFilter), [], onError('issuanceTrend')),
        settlePromise(this.getTopIssuers(dateFilter), [], onError('topIssuers')),
        settlePromise(this.getVerificationStats(dateFilter, issuerFilter), { totalVerifications: 0, successfulVerifications: 0, failedVerifications: 0, dailyVerifications: 0, weeklyVerifications: 0 }, onError('verificationStats')),
      ]);

    const result: CertificateStatsDto = {
      ...totalStats,
      issuanceTrend,
      topIssuers,
      verificationStats,
    };

    // Cache the result
    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL * 1000); // cache-manager v5+ uses ms

    return result;
  }

  async getPublicSummary(): Promise<Partial<CertificateStatsDto>> {
    const cacheKey = 'cert-stats:public-summary';
    const cached =
      await this.cacheManager.get<Partial<CertificateStatsDto>>(cacheKey);
    if (cached) {
      return cached;
    }

    const stats = await this.getTotalStats({}, {});

    await this.cacheManager.set(cacheKey, stats, this.CACHE_TTL * 1000);
    return stats;
  }

  private async getTotalStats(dateFilter: any, issuerFilter: any) {
    const where = { ...dateFilter, ...issuerFilter };

    const settled = await Promise.allSettled([
      this.certificateRepo.count({ where }),
      this.certificateRepo.count({
        where: { ...where, status: 'active' },
      }),
      this.certificateRepo.count({
        where: { ...where, status: 'revoked' },
      }),
      this.certificateRepo.count({
        where: { ...where, status: 'expired' },
      }),
    ]);

    const totalCertificates = this.settleResult(
      settled[0],
      0,
      'getTotalStats:total',
    );
    const activeCertificates = this.settleResult(
      settled[1],
      0,
      'getTotalStats:active',
    );
    const revokedCertificates = this.settleResult(
      settled[2],
      0,
      'getTotalStats:revoked',
    );
    const expiredCertificates = this.settleResult(
      settled[3],
      0,
      'getTotalStats:expired',
    );

    return {
      totalCertificates,
      activeCertificates,
      revokedCertificates,
      expiredCertificates,
    };
  }

  private async getIssuanceTrend(dateFilter: any, issuerFilter: any) {
    const startDate =
      dateFilter.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateFilter.endDate || new Date();

    const trendData = await this.certificateRepo
      .createQueryBuilder('cert')
      .select('DATE(cert.issuedAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('cert.issuedAt >= :startDate', { startDate })
      .andWhere('cert.issuedAt <= :endDate', { endDate })
      .andWhere(issuerFilter.issuerId ? 'cert.issuerId = :issuerId' : '1=1', {
        issuerId: issuerFilter.issuerId,
      })
      .groupBy('DATE(cert.issuedAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return trendData.map((item) => ({
      date: item.date,
      count: parseInt(item.count, 10),
    }));
  }

  private async getTopIssuers(dateFilter: any) {
    const query = this.certificateRepo
      .createQueryBuilder('cert')
      .select('cert.issuerId', 'issuerId')
      .addSelect('issuer.name', 'issuerName')
      .addSelect('COUNT(*)', 'certificateCount')
      .leftJoin('cert.issuer', 'issuer');

    if (dateFilter.startDate && dateFilter.endDate) {
      query.where('cert.issuedAt BETWEEN :start AND :end', {
        start: dateFilter.startDate,
        end: dateFilter.endDate,
      });
    }

    const topIssuersData = await query
      .groupBy('cert.issuerId')
      .addGroupBy('issuer.name')
      .orderBy('certificateCount', 'DESC')
      .limit(10)
      .getRawMany();

    return topIssuersData.map((item) => ({
      issuerId: item.issuerId,
      issuerName: item.issuerName || 'Unknown',
      certificateCount: parseInt(item.certificateCount, 10),
    }));
  }

  private async getVerificationStats(dateFilter: any, issuerFilter: any) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const baseWhere: any = {};
    if (issuerFilter.issuerId) {
      baseWhere.certificate = { issuerId: issuerFilter.issuerId };
    }
    if (dateFilter.startDate && dateFilter.endDate) {
      baseWhere.verifiedAt = Between(dateFilter.startDate, dateFilter.endDate);
    }

    const settled = await Promise.allSettled([
      this.verificationRepo.count({ where: baseWhere }),
      this.verificationRepo.count({
        where: { ...baseWhere, success: true },
      }),
      this.verificationRepo.count({
        where: { ...baseWhere, success: false },
      }),
      this.verificationRepo.count({
        where: {
          ...baseWhere,
          verifiedAt: MoreThanOrEqual(oneDayAgo),
        },
      }),
      this.verificationRepo.count({
        where: {
          ...baseWhere,
          verifiedAt: MoreThanOrEqual(sevenDaysAgo),
        },
      }),
    ]);

    const totalVerifications = this.settleResult(
      settled[0],
      0,
      'getVerificationStats:total',
    );
    const successfulVerifications = this.settleResult(
      settled[1],
      0,
      'getVerificationStats:successful',
    );
    const failedVerifications = this.settleResult(
      settled[2],
      0,
      'getVerificationStats:failed',
    );
    const dailyVerifications = this.settleResult(
      settled[3],
      0,
      'getVerificationStats:daily',
    );
    const weeklyVerifications = this.settleResult(
      settled[4],
      0,
      'getVerificationStats:weekly',
    );

    return {
      totalVerifications,
      successfulVerifications,
      failedVerifications,
      dailyVerifications,
      weeklyVerifications,
    };
  }

  private buildDateFilter(query: StatsQueryDto) {
    if (query.startDate && query.endDate) {
      return {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
        issuedAt: Between(new Date(query.startDate), new Date(query.endDate)),
      };
    }
    return {};
  }

  private generateCacheKey(query: StatsQueryDto): string {
    const parts = ['cert-stats'];
    if (query.startDate) parts.push(`start-${query.startDate}`);
    if (query.endDate) parts.push(`end-${query.endDate}`);
    if (query.issuerId) parts.push(`issuer-${query.issuerId}`);
    return parts.join(':');
  }

  async clearStatsCache(): Promise<void> {
    // Clear all stats-related cache entries
    const store = (this.cacheManager as any).store;
    if (store && store.keys) {
      const keys = await store.keys();
      const statsKeys = keys.filter((key: string) =>
        key.startsWith('cert-stats'),
      );
      await Promise.all(
        statsKeys.map((key: string) => this.cacheManager.del(key)),
      );
    }
  }

  /**
   * Unwrap a settled promise, logging rejections and returning a fallback so a
   * single failing query never breaks the aggregate statistics response.
   */
  private settleResult<T>(
    result: PromiseSettledResult<T>,
    fallback: T,
    label: string,
  ): T {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    const reason = result.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    this.logger.error(
      `Certificate stats "${label}" failed, using fallback: ${message}`,
    );
    return fallback;
  }
}
