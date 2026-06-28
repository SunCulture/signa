import { runtimeEvents } from '../runtime/runtime-events';
import { RealtimeEventListener } from './realtime-event.listener';
import { RealtimeService } from './realtime.service';

describe('RealtimeEventListener', () => {
  it('publishes submission completion with template scope', () => {
    const publish = jest.fn();
    const realtime = {
      publish,
    } as unknown as RealtimeService;
    const listener = new RealtimeEventListener(realtime);

    listener.handleSubmissionCompleted({
      accountId: '1',
      submissionId: '37',
      templateId: '25',
    });

    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: '1',
        submission_id: '37',
        template_id: '25',
        type: runtimeEvents.submissionCompleted,
      }),
    );
  });
});
