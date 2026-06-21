import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SigningService } from './signing.service';
import type { SigningRequestMetadata } from './signing-request-metadata';

@Controller()
@ApiTags('Submitter Tracking')
export class SubmitterTrackingController {
  constructor(private readonly signingService: SigningService) {}

  @Post('submitter_email_clicks')
  @ApiOkResponse({ schema: { type: 'object' } })
  async trackEmailClick(
    @Body('submitter_slug') slug: string,
    @Body('t') trackingParam: string | undefined,
    @Req() request: Request,
  ): Promise<Record<string, never>> {
    await this.signingService.trackEmailClick(
      slug,
      trackingParam,
      getTrackingMetadata(request),
    );

    return {};
  }

  @Post('submitter_sms_clicks')
  @ApiOkResponse({ schema: { type: 'object' } })
  async trackSmsClick(
    @Body('submitter_slug') slug: string,
    @Body('c') trackingParam: string | undefined,
    @Req() request: Request,
  ): Promise<Record<string, never>> {
    await this.signingService.trackSmsClick(
      slug,
      trackingParam,
      getTrackingMetadata(request),
    );

    return {};
  }

  @Post('submitter_form_views')
  @ApiOkResponse({ schema: { type: 'object' } })
  async trackFormView(
    @Body('submitter_slug') slug: string,
    @Req() request: Request,
  ): Promise<Record<string, never>> {
    await this.signingService.trackFormView(slug, getTrackingMetadata(request));

    return {};
  }
}

function getTrackingMetadata(request: Request): SigningRequestMetadata {
  return {
    ip: request.ip,
    ua: request.get('user-agent') ?? undefined,
  };
}
