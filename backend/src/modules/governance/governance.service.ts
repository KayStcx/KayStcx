import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal } from './entities/proposal.entity';
import { Vote } from './entities/vote.entity';
import { Delegation } from './entities/delegation.entity';
import { Treasury } from './entities/treasury.entity';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { VoteDto } from './dto/vote.dto';
import { DelegateDto } from './dto/delegate.dto';

@Injectable()
export class GovernanceService {
  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(Vote)
    private readonly voteRepo: Repository<Vote>,
    @InjectRepository(Delegation)
    private readonly delegationRepo: Repository<Delegation>,
    @InjectRepository(Treasury)
    private readonly treasuryRepo: Repository<Treasury>,
  ) {}

  async createProposal(dto: CreateProposalDto) {
    const proposal = this.proposalRepo.create(dto);
    return this.proposalRepo.save(proposal);
  }

  async getProposal(id: string) {
    const proposal = await this.proposalRepo.findOne({ where: { id } });
    if (!proposal) throw new NotFoundException('Proposal not found');
    return proposal;
  }

  async vote(proposalId: string, dto: VoteDto) {
    // TODO: Add token-weighted/quadratic voting, timelock, Sybil resistance
    const proposal = await this.getProposal(proposalId);
    const vote = this.voteRepo.create({ ...dto, proposal });
    return this.voteRepo.save(vote);
  }

  async delegate(dto: DelegateDto) {
    // TODO: Add delegation logic, cap enforcement
    const delegation = this.delegationRepo.create(dto);
    return this.delegationRepo.save(delegation);
  }

  // TODO: Implement proposal curation, execution, timelock, treasury management, Sybil resistance
}
