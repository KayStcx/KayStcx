import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { once } from 'events';
import type { Writable } from 'stream';
import {
  Repository,
  SelectQueryBuilder,
  Between,
  In,
  Like,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import { AuditLog } from '../entities';
import { AuditAction, AuditResourceType } from '../constants';
import { AuditSearchDto, AuditStatisticsDto } from '../dto';
import { RequestContextService } from './request-context.service';
import { LoggingService } from '../../../common/logging/logging.service';

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 50;
export const DEFAULT_EXPORT_MAX_ROWS = 100000;

const CSV_HEADER =
  'ID,Action,Resource Type,Resource ID,User ID,User Email,IP Address,Status,Timestamp,Error Message,Correlation ID';

export interface LogAuditParams {
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  transactionHash?: string;
  resourceData?: any;
  changes?: {
    before?: any;
    after?: any;
  };
  metadata?: Record<string, any>;
  status?: 'success' | 'failure' | 'error';
  errorMessage?: string;
  timestamp?: number;
}

@Injectable()
export class AuditService {

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private requestContextService: RequestContextService,
    private readonly logger: LoggingService,
    private readonly configService: ConfigService,
  ) {}

  async log(params: LogAuditParams): Promise<AuditLog | null> {
    try {
      const redactedChanges = params.changes
        ? this.redactSensitiveData(params.changes)
        : undefined;
      const redactedResourceData = params.resourceData
        ? this.redactSensitiveData(params.resourceData)
        : undefined;
      const redactedMetadata = params.metadata
        ? this.redactSensitiveData(params.metadata)
        : undefined;

      const auditLog = this.auditLogRepository.create({
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        userId: params.userId,
        userEmail: params.userEmail,
        userRole: params.userRole,
        ipAddress: params.ipAddress || 'unknown',
        userAgent: params.userAgent,
        correlationId: params.correlationId,
        transactionHash: params.transactionHash,
        resourceData: redactedResourceData,
        changes: redactedChanges,
        metadata: redactedMetadata,
        status: params.status || 'success',
        errorMessage: params.errorMessage,
        timestamp: params.timestamp || Date.now(),
      });

      const saved = await this.auditLogRepository.save(auditLog);
      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to log audit event: ${error.message}`,
        error.stack,
      );
      // Don't throw - audit failures should not break main operations
      return null;
    }
  }

  /**
   * Redacts sensitive data from an object recursively
   */
  private redactSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.redactSensitiveData(item));
    }

    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'privateKey',
      'apiKey',
      'auth',
      'credential',
      'ssn',
      'creditCard',
    ];

    const redacted = { ...data };

    for (const key of Object.keys(redacted)) {
      // Check if the key itself contains a sensitive string (case-insensitive)
      const isSensitive = sensitiveKeys.some((sk) =>
        key.toLowerCase().includes(sk.toLowerCase()),
      );

      if (isSensitive) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = this.redactSensitiveData(redacted[key]);
      }
    }

    return redacted;
  }

  async search(
    searchDto: AuditSearchDto,
    options: { bypassPageSizeLimit?: boolean } = {},
  ): Promise<{ data: AuditLog[]; total: number }> {
    const query = this.auditLogRepository.createQueryBuilder('audit');
    this.applySearchFilters(query, searchDto);

    const skip = searchDto.skip || 0;
    const take = this.resolvePageSize(
      searchDto.take,
      !!options.bypassPageSizeLimit,
    );

    query.skip(skip).take(take);

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  /**
   * Applies the shared audit-log filters (and default ordering) to a query
   * builder. Used by both the paginated `search()` path and the streaming
   * `exportToCsv()` path so the two never drift apart.
   */
  private applySearchFilters(
    query: SelectQueryBuilder<AuditLog>,
    searchDto: AuditSearchDto,
  ): void {
    if (searchDto.action) {
      query.andWhere('audit.action = :action', { action: searchDto.action });
    }

    if (searchDto.resourceType) {
      query.andWhere('audit.resourceType = :resourceType', {
        resourceType: searchDto.resourceType,
      });
    }

    if (searchDto.userId) {
      query.andWhere('audit.userId = :userId', { userId: searchDto.userId });
    }

    if (searchDto.userEmail) {
      query.andWhere('audit.userEmail ILIKE :userEmail', {
        userEmail: `%${searchDto.userEmail}%`,
      });
    }

    if (searchDto.resourceId) {
      query.andWhere('audit.resourceId = :resourceId', {
        resourceId: searchDto.resourceId,
      });
    }

    if (searchDto.correlationId) {
      query.andWhere('audit.correlationId = :correlationId', {
        correlationId: searchDto.correlationId,
      });
    }

    if (searchDto.ipAddress) {
      query.andWhere('audit.ipAddress = :ipAddress', {
        ipAddress: searchDto.ipAddress,
      });
    }

    if (searchDto.status) {
      query.andWhere('audit.status = :status', { status: searchDto.status });
    }

    if (searchDto.startDate || searchDto.endDate) {
      const startTime = searchDto.startDate
        ? new Date(searchDto.startDate).getTime()
        : 0;
      const endTime = searchDto.endDate
        ? new Date(searchDto.endDate).getTime() + 86400000 // Add 24 hours for end of day
        : Date.now();

      query.andWhere('audit.timestamp BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      });
    }

    query.orderBy('audit.timestamp', 'DESC');
  }

  async getStatistics(
    filters?: Partial<AuditSearchDto>,
  ): Promise<AuditStatisticsDto> {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (filters?.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters?.resourceType) {
      query.andWhere('audit.resourceType = :resourceType', {
        resourceType: filters.resourceType,
      });
    }

    if (filters?.userId) {
      query.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    if (filters?.startDate || filters?.endDate) {
      const startTime = filters.startDate
        ? new Date(filters.startDate).getTime()
        : 0;
      const endTime = filters.endDate
        ? new Date(filters.endDate).getTime() + 86400000
        : Date.now();
      query.andWhere('audit.timestamp BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      });
    }

    // Total events
    const totalEvents = await query.getCount();

    // Events by action
    const eventsByActionRaw = await query
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .getRawMany();

    const eventsByAction = eventsByActionRaw.reduce(
      (acc, { action, count }) => {
        acc[action] = parseInt(count);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Events by resource type
    const eventsByResourceTypeRaw = await query
      .select('audit.resourceType', 'resourceType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.resourceType')
      .getRawMany();

    const eventsByResourceType = eventsByResourceTypeRaw.reduce(
      (acc, { resourceType, count }) => {
        acc[resourceType] = parseInt(count);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Events by status
    const eventsByStatusRaw = await query
      .select('audit.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.status')
      .getRawMany();

    const eventsByStatus = eventsByStatusRaw.reduce(
      (acc, { status, count }) => {
        acc[status] = parseInt(count);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Events per day
    const eventsPerDayRaw = await query
      .select('DATE(to_timestamp(audit.timestamp / 1000))', 'date')
      .addSelect('COUNT(*)', 'count')
      .groupBy('DATE(to_timestamp(audit.timestamp / 1000))')
      .orderBy('DATE(to_timestamp(audit.timestamp / 1000))', 'DESC')
      .limit(30)
      .getRawMany();

    const eventsPerDay = eventsPerDayRaw.reduce(
      (acc, { date, count }) => {
        acc[date] = parseInt(count);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Top users
    const topUsersRaw = await query
      .select('audit.userId', 'userId')
      .addSelect('audit.userEmail', 'userEmail')
      .addSelect('COUNT(*)', 'eventCount')
      .groupBy('audit.userId')
      .addGroupBy('audit.userEmail')
      .orderBy('eventCount', 'DESC')
      .limit(10)
      .getRawMany();

    const topUsers = topUsersRaw.map((row) => ({
      userId: row.userId,
      userEmail: row.userEmail,
      eventCount: parseInt(row.eventCount),
    }));

    // Top resources
    const topResourcesRaw = await query
      .select('audit.resourceId', 'resourceId')
      .addSelect('audit.resourceType', 'resourceType')
      .addSelect('COUNT(*)', 'eventCount')
      .groupBy('audit.resourceId')
      .addGroupBy('audit.resourceType')
      .orderBy('eventCount', 'DESC')
      .limit(10)
      .getRawMany();

    const topResources = topResourcesRaw.map((row) => ({
      resourceId: row.resourceId,
      resourceType: row.resourceType,
      eventCount: parseInt(row.eventCount),
    }));

    return {
      totalEvents,
      eventsByAction,
      eventsByResourceType,
      eventsByStatus,
      eventsPerDay,
      topUsers,
      topResources,
    };
  }

  /**
   * Streams matching audit logs to the provided writable response as CSV.
   *
   * Instead of materialising the full result set in memory, it first counts the
   * matching rows (to enforce `AUDIT_EXPORT_MAX_ROWS`), then streams them from
   * the database cursor in chunks — bounded memory regardless of table size.
   */
  async exportToCsv(searchDto: AuditSearchDto, res: Writable): Promise<void> {
    const maxRows = this.getExportMaxRows();

    const countQuery = this.auditLogRepository.createQueryBuilder('audit');
    this.applySearchFilters(countQuery, searchDto);
    const total = await countQuery.getCount();

    if (total > maxRows) {
      throw new BadRequestException(
        `Export would return ${total.toLocaleString()} audit logs, which exceeds the AUDIT_EXPORT_MAX_ROWS limit of ${maxRows.toLocaleString()}. Narrow your filters (for example, add a date range) and try again.`,
      );
    }

    // Write the header up front so callers that set `Content-Disposition` can
    // start streaming before any row data flows.
    res.write(`${CSV_HEADER}\n`);

    if (total === 0) {
      res.end();
      return;
    }

    const streamQuery = this.auditLogRepository.createQueryBuilder('audit');
    this.applySearchFilters(streamQuery, searchDto);
    streamQuery
      .select('audit.id', 'id')
      .addSelect('audit.action', 'action')
      .addSelect('audit.resourceType', 'resourceType')
      .addSelect('audit.resourceId', 'resourceId')
      .addSelect('audit.userId', 'userId')
      .addSelect('audit.userEmail', 'userEmail')
      .addSelect('audit.ipAddress', 'ipAddress')
      .addSelect('audit.status', 'status')
      .addSelect('audit.timestamp', 'timestamp')
      .addSelect('audit.errorMessage', 'errorMessage')
      .addSelect('audit.correlationId', 'correlationId')
      .take(maxRows);

    const stream = await streamQuery.stream();

    for await (const row of stream) {
      const line = this.toCsvLine(row);
      if (!res.write(`${line}\n`)) {
        await once(res, 'drain');
      }
    }

    res.end();
  }

  /**
   * Resolves the export row cap, falling back to `DEFAULT_EXPORT_MAX_ROWS`
   * when the `AUDIT_EXPORT_MAX_ROWS` env var is absent or invalid.
   */
  private getExportMaxRows(): number {
    const raw = this.configService.get<string | number>(
      'AUDIT_EXPORT_MAX_ROWS',
    );

    if (raw === undefined || raw === null || raw === '') {
      return DEFAULT_EXPORT_MAX_ROWS;
    }

    const parsed =
      typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      this.logger.warn(
        `Invalid AUDIT_EXPORT_MAX_ROWS value "${raw}"; falling back to ${DEFAULT_EXPORT_MAX_ROWS}`,
      );
      return DEFAULT_EXPORT_MAX_ROWS;
    }

    return parsed;
  }

  private toCsvLine(row: Record<string, unknown>): string {
    return [
      row.id,
      row.action,
      row.resourceType,
      row.resourceId,
      row.userId,
      row.userEmail,
      row.ipAddress,
      row.status,
      this.formatTimestamp(row.timestamp),
      row.errorMessage,
      row.correlationId,
    ]
      .map((value) => this.escapeCsvCell(value))
      .join(',');
  }

  private escapeCsvCell(value: unknown): string {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  private formatTimestamp(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    const millis =
      typeof value === 'number' ? value : Number.parseInt(String(value), 10);

    if (!Number.isFinite(millis)) {
      return '';
    }

    return new Date(millis).toISOString();
  }

  /**
   * Resolves the page size for a search query, enforcing MAX_PAGE_SIZE so a
   * single request can never return an unbounded number of rows.
   *
   * @param take Requested page size; non-positive or undefined falls back to
   * DEFAULT_PAGE_SIZE.
   * @param bypassPageSizeLimit When true (internal export path), the clamp is
   * skipped so CSV exports can page through the full result set.
   */
  private resolvePageSize(
    take: number | undefined,
    bypassPageSizeLimit: boolean,
  ): number {
    const requested = take && take > 0 ? take : DEFAULT_PAGE_SIZE;

    if (bypassPageSizeLimit) {
      return requested;
    }

    if (requested > MAX_PAGE_SIZE) {
      this.logger.warn(
        `Audit search requested page size ${requested} exceeds MAX_PAGE_SIZE ${MAX_PAGE_SIZE}; clamping to ${MAX_PAGE_SIZE}`,
      );
      return MAX_PAGE_SIZE;
    }

    return requested;
  }

  async cleanupOldLogs(retentionDays: number): Promise<number> {
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    const result = await this.auditLogRepository.delete({
      timestamp: LessThanOrEqual(cutoffTime),
    });

    return result.affected || 0;
  }

  async getLog(id: string): Promise<AuditLog | null> {
    return this.auditLogRepository.findOne({ where: { id } });
  }

  async countByAction(action: AuditAction): Promise<number> {
    return this.auditLogRepository.countBy({ action });
  }

  async countByResourceType(resourceType: AuditResourceType): Promise<number> {
    return this.auditLogRepository.countBy({ resourceType });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.auditLogRepository.countBy({ userId });
  }

  async getUserActions(
    userId: string,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getResourceAudits(
    resourceId: string,
    limit: number = 50,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { resourceId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }
}
