import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issuer } from './issuer.entity';
import { CreateIssuerDto } from './dto/create-issuer.dto';
import { isValidStellarPublicKey } from './utils/stellar';

@Injectable()
export class IssuersService {
  constructor(
    @InjectRepository(Issuer)
    private readonly issuerRepo: Repository<Issuer>,
  ) {}

  async createIssuer(dto: CreateIssuerDto) {
    if (!isValidStellarPublicKey(dto.stellarPublicKey)) {
      throw new BadRequestException('Invalid Stellar public key');
    }
    const issuer = this.issuerRepo.create(dto);
    return this.issuerRepo.save(issuer);
  }

  async removeIssuer(id: string) {
    const issuer = await this.issuerRepo.findOne({ where: { id } });
    if (!issuer) throw new NotFoundException('Issuer not found');
    return this.issuerRepo.remove(issuer);
  }

  async listIssuers() {
    return this.issuerRepo.find();
  }

  async incrementCertificateCount(issuerId: string) {
    await this.issuerRepo.increment({ id: issuerId }, 'certificateCount', 1);
  }
}
import { Injectable } from '@nestjs/common';

@Injectable()
export class IssuersService {
  findAll(): any[] {
    // Placeholder for issuers logic
    return [];
  }
}
