import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { User, UserRole, UserStatus } from '../../users/entities/user.entity';
import { Certificate } from '../../certificate/entities/certificate.entity';
import { Verification } from '../../certificate/entities/verification.entity';
import { Issuer } from '../../issuers/entities/issuer.entity';
import {
  AdminAnalyticsQueryDto,
  AdminAnalyticsDto,
  UsersByRoleDto,
  UsersByStatusDto,
  CertificatesByStatusDto,
  TopIssuerAnalyticsDto,
  VerificationTrendsDto,
  UserRegistrationTrendDto,
  CertificateIssuanceTrendDto,
} from '../dto/admin-analytics.dto';

@Injectable()
export class AdminAnalyticsService {
  private readonly CACHE_TTL = 120; // 2 minutes in seconds

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Certificate)
    private certificateRepo: Repository<Certificate>,
    @InjectRepository(Verification)
    private verificationRepo: Repository<Verification>,
    @InjectRepository(Issuer)
    private issuerRepo: Repository<Issuer>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * Get comprehensive admin analytics for platform-wide dashboard
   */
  async getAnalytics(
    query: AdminAnalyticsQueryDto,
  ): Promise<AdminAnalyticsDto> {
    const cacheKey = this.generateCacheKey(query);

    // Try to get from cache
    const cached = await this.cacheManager.get<AdminAnalyticsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Build date filters
    const dateFilter = this.buildDateFilter(query);

    // Fetch all analytics data in parallel
    const [
      usersByRole,
      usersByStatus,
      certificatesByStatus,
      topIssuers,
      verificationTrends,
      userRegistrationTrend,
      certificateIssuanceTrend,
      totalIssuers,
    ] = await Promise.all([
      this.getUsersByRole(),
      this.getUsersByStatus(),
      this.getCertificatesByStatus(dateFilter),
      this.getTopIssuers(dateFilter),
      this.getVerificationTrends(dateFilter),
      this.getUserRegistrationTrend(dateFilter),
      this.getCertificateIssuanceTrend(dateFilter),
      this.issuerRepo.count({ where: { isActive: true } }),
    ]);

    const result: AdminAnalyticsDto = {
      usersByRole,
      usersByStatus,
      certificatesByStatus,
      topIssuers,
      verificationTrends,
      userRegistrationTrend,
      certificateIssuanceTrend,
      totalIssuers,
    };

    // Cache the result
    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL * 1000);

    return result;
  }

  /**
   * Get user count breakdown by role
   */
  private async getUsersByRole(): Promise<UsersByRoleDto> {
    const [users, issuers, admins] = await Promise.all([
      this.userRepo.count({ where: { role: UserRole.USER } }),
      this.userRepo.count({ where: { role: UserRole.ISSUER } }),
      this.userRepo.count({ where: { role: UserRole.ADMIN } }),
    ]);

    return {
      users,
      issuers,
      admins,
      total: users + issuers + admins,
    };
  }

  /**
   * Get user count breakdown by status
   */
  private async getUsersByStatus(): Promise<UsersByStatusDto> {
    const [active, inactive, suspended, pendingVerification] =
      await Promise.all([
        this.userRepo.count({ where: { status: UserStatus.ACTIVE } }),
        this.userRepo.count({ where: { status: UserStatus.INACTIVE } }),
        this.userRepo.count({ where: { status: UserStatus.SUSPENDED } }),
        this.userRepo.count({
          where: { status: UserStatus.PENDING_VERIFICATION },
        }),
      ]);

    return {
      active,
      inactive,
      suspended,
      pendingVerification,
    };
  }

  /**
   * Get certificate count breakdown by status
   */
  private async getCertificatesByStatus(
    dateFilter: any,
  ): Promise<CertificatesByStatusDto> {
    const where = dateFilter.where || {};

    const [total, active, revoked, expired] = await Promise.all([
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

    return {
      active,
      revoked,
      expired,
      total,
    };
  }

  /**
   * Get top issuers by certificate count
   */
  private async getTopIssuers(
    dateFilter: any,
  ): Promise<TopIssuerAnalyticsDto[]> {
    const totalCerts = await this.certificateRepo.count({
      where: dateFilter.where,
    });

    const topIssuersData = this.certificateRepo
      .createQueryBuilder('cert')
      .select('cert.issuerId', 'issuerId')
      .addSelect('issuer.name', 'issuerName')
      .addSelect('COUNT(*)', 'certificateCount')
      .leftJoin('cert.issuer', 'issuer');

    if (dateFilter.startDate && dateFilter.endDate) {
      topIssuersData.where('cert.issuedAt BETWEEN :start AND :end', {
        start: dateFilter.startDate,
        end: dateFilter.endDate,
      });
    }

    const result = await topIssuersData
      .groupBy('cert.issuerId')
      .addGroupBy('issuer.name')
      .orderBy('certificateCount', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map((item) => ({
      issuerId: item.issuerId,
      issuerName: item.issuerName || 'Unknown',
      certificateCount: parseInt(item.certificateCount, 10),
      percentage:
        totalCerts > 0
          ? Math.round(
              (parseInt(item.certificateCount, 10) / totalCerts) * 100 * 10,
            ) / 10
          : 0,
    }));
  }

  /**
   * Get system-wide verification trends
   */
  private async getVerificationTrends(
    dateFilter: any,
  ): Promise<VerificationTrendsDto> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const baseWhere: any = {};
    if (dateFilter.startDate && dateFilter.endDate) {
      baseWhere.verifiedAt = Between(dateFilter.startDate, dateFilter.endDate);
    }

    const [total, successful, failed, last24h, last7d, last30d] =
      await Promise.all([
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
        this.verificationRepo.count({
          where: {
            ...baseWhere,
            verifiedAt: MoreThanOrEqual(thirtyDaysAgo),
          },
        }),
      ]);

    return {
      total,
      successful,
      failed,
      successRate:
        total > 0 ? Math.round((successful / total) * 100 * 10) / 10 : 0,
      last24Hours: last24h,
      last7Days: last7d,
      last30Days: last30d,
    };
  }

  /**
   * Get user registration trends over time
   */
  private async getUserRegistrationTrend(
    dateFilter: any,
  ): Promise<UserRegistrationTrendDto[]> {
    const startDate =
      dateFilter.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateFilter.endDate || new Date();

    const trendData = await this.userRepo
      .createQueryBuilder('user')
      .select('DATE(user.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt >= :startDate', { startDate })
      .andWhere('user.createdAt <= :endDate', { endDate })
      .groupBy('DATE(user.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return trendData.map((item) => ({
      date: item.date,
      count: parseInt(item.count, 10),
    }));
  }

  /**
   * Get certificate issuance trends over time
   */
  private async getCertificateIssuanceTrend(
    dateFilter: any,
  ): Promise<CertificateIssuanceTrendDto[]> {
    const startDate =
      dateFilter.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateFilter.endDate || new Date();

    const trendData = await this.certificateRepo
      .createQueryBuilder('cert')
      .select('DATE(cert.issuedAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('cert.issuedAt >= :startDate', { startDate })
      .andWhere('cert.issuedAt <= :endDate', { endDate })
      .groupBy('DATE(cert.issuedAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return trendData.map((item) => ({
      date: item.date,
      count: parseInt(item.count, 10),
    }));
  }

  /**
   * Build date filter object for queries
   */
  private buildDateFilter(query: AdminAnalyticsQueryDto): any {
    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      return {
        startDate: start,
        endDate: end,
        where: {
          issuedAt: Between(start, end),
        },
      };
    }
    return {};
  }

  /**
   * Generate cache key for analytics query
   */
  private generateCacheKey(query: AdminAnalyticsQueryDto): string {
    const parts = ['admin-analytics'];
    if (query.startDate) parts.push(`start-${query.startDate}`);
    if (query.endDate) parts.push(`end-${query.endDate}`);
    return parts.join(':');
  }

  /**
   * Clear analytics cache (called when data changes)
   */
  async clearCache(): Promise<void> {
    const store = (this.cacheManager as any).store;
    if (store && store.keys) {
      const keys = await store.keys();
      const adminKeys = keys.filter((key: string) =>
        key.startsWith('admin-analytics'),
      );
      await Promise.all(
        adminKeys.map((key: string) => this.cacheManager.del(key)),
      );
    }
  }
}
