
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GovernanceService } from './governance.service';
import { GovernanceController } from './governance.controller';
import { Proposal } from './entities/proposal.entity';
import { Vote } from './entities/vote.entity';
import { Delegation } from './entities/delegation.entity';
import { Treasury } from './entities/treasury.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Proposal, Vote, Delegation, Treasury])],
  providers: [GovernanceService],
  controllers: [GovernanceController],
})
export class GovernanceModule {}
