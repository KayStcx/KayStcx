import { Module } from '@nestjs/common';
import { CRLService } from './crl.service';
import { CRLController } from './crl.controller';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [StellarModule],
  controllers: [CRLController],
  providers: [CRLService],
  exports: [CRLService],
})
export class CRLModule {}