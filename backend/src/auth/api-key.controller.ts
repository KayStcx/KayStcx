import { Controller, Post, Delete, Param, Body } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';

@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post('generate')
  async generate(@Body('owner') owner: string, @Body('rateLimit') rateLimit: number) {
    return this.apiKeyService.generateKey(owner, rateLimit);
  }

  @Delete(':key')
  async revoke(@Param('key') key: string) {
    await this.apiKeyService.revokeKey(key);
    return { revoked: true };
  }

  @Post('rotate/:key')
  async rotate(@Param('key') key: string) {
    return this.apiKeyService.rotateKey(key);
  }
}
