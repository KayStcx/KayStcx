import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobsService],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  it('should enqueue email job', async () => {
    const result = await service.enqueueEmailJob({ to: 'test@example.com' });
    expect(result).toBeDefined();
  });
});
