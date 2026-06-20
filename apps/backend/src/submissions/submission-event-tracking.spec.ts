import {
  buildSubmitterEventTrackingParam,
  isValidSubmitterEventTrackingParam,
} from './submission-event-tracking';

describe('submission event tracking', () => {
  it('builds and validates signed short submitter event params', () => {
    const trackingParam = buildSubmitterEventTrackingParam({
      secret: 'development-secret',
      submitterSlug: 'submitter-slug',
    });

    expect(trackingParam).toHaveLength(6);
    expect(
      isValidSubmitterEventTrackingParam({
        secret: 'development-secret',
        submitterSlug: 'submitter-slug',
        trackingParam,
      }),
    ).toBe(true);
  });

  it('rejects tracking params signed for a different event', () => {
    const trackingParam = buildSubmitterEventTrackingParam({
      eventType: 'click_sms',
      secret: 'development-secret',
      submitterSlug: 'submitter-slug',
    });

    expect(
      isValidSubmitterEventTrackingParam({
        eventType: 'click_email',
        secret: 'development-secret',
        submitterSlug: 'submitter-slug',
        trackingParam,
      }),
    ).toBe(false);
  });
});
