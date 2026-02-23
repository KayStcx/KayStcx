export class CreateProposalDto {
  type: 'parameter' | 'upgrade' | 'treasury' | 'general';
  title: string;
  description: string;
  actions?: any;
  proposer: string;
  startTime?: Date;
  endTime?: Date;
}
