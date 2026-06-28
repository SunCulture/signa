import { firstValueFrom, timeout } from 'rxjs';
import { RealtimeService } from './realtime.service';
import type { RealtimeEvent } from './realtime.types';

describe('RealtimeService', () => {
  it('emits matching account and template events', async () => {
    const service = new RealtimeService();
    const eventPromise = firstValueFrom(
      service.stream('1', { templateId: '21' }).pipe(timeout(100)),
    );

    service.publish({
      account_id: '1',
      data: { changed: true },
      template_id: '21',
      type: 'template.updated',
    });

    const message = await eventPromise;
    const event = message.data as RealtimeEvent;

    expect(message.type).toBe('template.updated');
    expect(event.account_id).toBe('1');
    expect(event.template_id).toBe('21');
  });

  it('does not emit events for another account', async () => {
    const service = new RealtimeService();
    const eventPromise = firstValueFrom(
      service.stream('1', { templateId: '21' }).pipe(timeout(30)),
    );

    service.publish({
      account_id: '2',
      data: {},
      template_id: '21',
      type: 'template.updated',
    });

    await expect(eventPromise).rejects.toThrow();
  });
});
