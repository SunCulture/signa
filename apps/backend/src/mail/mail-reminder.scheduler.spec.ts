import { runtimeJobNames } from '../runtime/runtime-jobs';
import { MailReminderScheduler } from './mail-reminder.scheduler';

describe('MailReminderScheduler', () => {
  it('queues the next due reminder email once', async () => {
    const sentAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const submitter = {
      id: 'submitter-1',
      accountId: 'account-1',
      sentAt,
      preferences: { send_email: true },
    };
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([submitter]),
    };
    const accountConfigs = {
      find: jest.fn().mockResolvedValue([
        {
          accountId: 'account-1',
          value: {
            first_duration: 'one_hour',
            second_duration: null,
            third_duration: null,
          },
        },
      ]),
    };
    const submissionEvents = {
      count: jest.fn().mockResolvedValue(0),
    };
    const submitters = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const mailQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };
    const scheduler = new MailReminderScheduler(
      accountConfigs as never,
      submissionEvents as never,
      submitters as never,
      mailQueue as never,
    );

    await scheduler.enqueueDueReminders();

    expect(mailQueue.add).toHaveBeenCalledWith(
      runtimeJobNames.deliverReminderEmail,
      { reminderIndex: 1, submitterId: 'submitter-1' },
      expect.objectContaining({
        jobId: 'submitter-reminder:submitter-1:1',
      }),
    );
  });
});
