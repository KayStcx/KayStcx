import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { CreateIssuerDto } from './dto/create-issuer.dto';
import { Issuer, IssuerTier } from './entities/issuer.entity';

@Injectable()
export class IssuersService {
  private readonly logger = new Logger(IssuersService.name);

  constructor(
    @InjectRepository(Issuer)
    private readonly issuerRepository: Repository<Issuer>,
  ) {}

  async findAll(): Promise<Issuer[]> {
    return this.issuerRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findByApiKey(apiKey: string): Promise<Issuer> {
    const issuer = await this.issuerRepository.findOne({ where: { apiKey } });

    if (!issuer) {
      throw new NotFoundException('Issuer not found');
    }

    return issuer;
  }

  async create(dto: CreateIssuerDto): Promise<Issuer> {
    const issuer = this.issuerRepository.create({
      ...dto,
      isActive: dto.isActive ?? true,
      tier: dto.tier ?? IssuerTier.FREE,
      apiKey: this.generateApiKey(),
    });

    const savedIssuer = await this.issuerRepository.save(issuer);
    this.logger.log(`Created issuer ${savedIssuer.id} with API key ${savedIssuer.apiKey}`);
    return savedIssuer;
  }

  async isIssuerActive(apiKey: string): Promise<boolean> {
    const issuer = await this.findByApiKey(apiKey);
    return issuer.isActive;
  }

  private generateApiKey(): string {
    return `sk_live_${randomBytes(24).toString('hex')}`;
  }
}
