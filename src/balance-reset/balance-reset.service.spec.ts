import { getQueueToken } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { BalanceResetService } from './balance-reset.service';

describe('BalanceResetService', () => {
  let service: BalanceResetService;

  const upsertJobSchedulerMock = jest.fn();
  const addJobMock = jest.fn();

  const queueMock = {
    upsertJobScheduler: upsertJobSchedulerMock,
    add: addJobMock,
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceResetService,
        {
          provide: getQueueToken('balance-reset'),
          useValue: queueMock,
        },
      ],
    }).compile();

    service = module.get<BalanceResetService>(BalanceResetService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should successfully upsert job scheduler', async () => {
      upsertJobSchedulerMock.mockResolvedValue(undefined);

      await expect(service.onModuleInit()).resolves.toBeUndefined();

      expect(upsertJobSchedulerMock).toHaveBeenCalledTimes(1);
      expect(upsertJobSchedulerMock).toHaveBeenCalledWith(
        'balance-reset-10m-scheduler',
        {
          every: 1000 * 60 * 10,
        },
        {
          name: 'schedule-reset-balances',
        },
      );
    });

    it('should rethrow an error if upsertJobScheduler fails', async () => {
      const error = new Error('Redis connection failed');

      upsertJobSchedulerMock.mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toBe(error);

      expect(addJobMock).not.toHaveBeenCalled();
    });
  });

  describe('resetBalances', () => {
    it('should successfully add a job to the queue', async () => {
      addJobMock.mockResolvedValue(undefined);

      await expect(service.resetBalances()).resolves.toBeUndefined();

      expect(addJobMock).toHaveBeenCalledTimes(1);
      expect(addJobMock).toHaveBeenCalledWith('reset-balances', {});
    });

    it('should rethrow an error if adding the job fails', async () => {
      const error = new Error('Queue is full');

      addJobMock.mockRejectedValue(error);

      await expect(service.resetBalances()).rejects.toBe(error);
    });
  });
});
