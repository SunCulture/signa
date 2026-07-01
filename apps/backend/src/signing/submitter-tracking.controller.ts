import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SigningService } from './signing.service';
import type { SigningRequestMetadata } from './signing-request-metadata';

@Controller()
@ApiTags('Submitter Tracking')
export class SubmitterTrackingController {
  constructor(private readonly signingService: SigningService) {}

  @Post('submitter_email_clicks')
  @ApiOperation({
    description:
      'DocuSeal-compatible tracking endpoint used by email links to record recipient click-through events.',
    summary: 'Track submitter email click',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['submitter_slug'],
      properties: {
        submitter_slug: {
          description: 'Public submitter slug from the email link.',
          example: 'pAMimKcyrLjqVt',
          type: 'string',
        },
        t: {
          description: 'Optional email tracking token.',
          example: 'email_01HX...',
          type: 'string',
        },
      },
    },
  })
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
  @ApiOperation({
    description:
      'Tracking endpoint used by SMS links to record recipient click-through events.',
    summary: 'Track submitter SMS click',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['submitter_slug'],
      properties: {
        c: {
          description: 'Optional SMS tracking token.',
          example: 'sms_01HX...',
          type: 'string',
        },
        submitter_slug: {
          description: 'Public submitter slug from the SMS link.',
          example: 'pAMimKcyrLjqVt',
          type: 'string',
        },
      },
    },
  })
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
  @ApiOperation({
    description:
      'DocuSeal-compatible tracking endpoint for recording a recipient opening the signing form.',
    summary: 'Track submitter form view',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['submitter_slug'],
      properties: {
        submitter_slug: {
          description: 'Public submitter slug for the opened signing form.',
          example: 'pAMimKcyrLjqVt',
          type: 'string',
        },
      },
    },
  })
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
