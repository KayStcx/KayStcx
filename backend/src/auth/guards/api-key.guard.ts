import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKeyHeader = request.headers['x-api-key'];
    if (!apiKeyHeader) throw new UnauthorizedException('Missing API key');

    const apiKey = await this.apiKeyService.validateKey(apiKeyHeader);
    if (!apiKey) throw new UnauthorizedException('Invalid or expired API key');

    request.apiKey = apiKey;
    return true;
  }
}
