import { Module } from '@nestjs/common';
import { MultisigService } from './multisig.service';
import { MultisigController } from './multisig.controller';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [StellarModule],
  controllers: [MultisigController],
  providers: [MultisigService],
  exports: [MultisigService],
})
export class MultisigModule {}