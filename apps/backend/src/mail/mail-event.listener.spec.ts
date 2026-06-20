import { runtimeJobNames } from '../runtime/runtime-jobs';
import { MailEventListener } from './mail-event.listener';

describe('MailEventListener', () => {
  let queue: { add: jest.Mock };
  let listener: MailEventListener;

  beforeEach(() => {
    queue = {
      add: jest.fn().mockResolvedValue(undefined),
    };
    listener = new MailEventListener(queue as never);
  });

  it('queues signature request emails from submitter invitation events', async () => {
    await listener.handleSubmitterInvitationRequested({
      submitterId: 'submitter-1',
      accountId: 'account-1',
    });

    expect(queue.add).toHaveBeenCalledWith(
      runtimeJobNames.deliverSignatureRequestEmail,
      { submitterId: 'submitter-1' },
      expect.objectContaining({
        attempts: 3,
        removeOnComplete: true,
      }),
    );
  });

  it('queues completion and decline delivery jobs', async () => {
    await listener.handleFormCompleted({ submitterId: 'submitter-1' });
    await listener.handleFormDeclined({
      submitterId: 'submitter-1',
      reason: 'No longer needed',
    });

    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      runtimeJobNames.deliverCompletedEmail,
      { submitterId: 'submitter-1' },
      expect.any(Object),
    );
    expect(queue.add).toHaveBeenNthCalledWith(
      2,
      runtimeJobNames.deliverDeclinedEmail,
      {
        submitterId: 'submitter-1',
        reason: 'No longer needed',
      },
      expect.any(Object),
    );
  });
});
