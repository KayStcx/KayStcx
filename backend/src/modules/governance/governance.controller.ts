import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { GovernanceService } from './governance.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { VoteDto } from './dto/vote.dto';
import { DelegateDto } from './dto/delegate.dto';

@Controller('governance')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Post('proposals')
  async createProposal(@Body() dto: CreateProposalDto) {
    return this.governanceService.createProposal(dto);
  }

  @Get('proposals/:id')
  async getProposal(@Param('id') id: string) {
    return this.governanceService.getProposal(id);
  }

  @Post('proposals/:id/vote')
  async vote(@Param('id') id: string, @Body() dto: VoteDto) {
    return this.governanceService.vote(id, dto);
  }

  @Post('delegate')
  async delegate(@Body() dto: DelegateDto) {
    return this.governanceService.delegate(dto);
  }
}
