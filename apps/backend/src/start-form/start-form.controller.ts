import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import {
  SendStartFormEmailVerificationDto,
  StartFormResponseDto,
  StartFormSubmitResponseDto,
  StartFormVerificationResponseDto,
  SubmitStartFormDto,
  VerifyStartFormEmailVerificationDto,
} from './dto/start-form.dto';
import { StartFormService } from './start-form.service';

@Controller('start-form')
@ApiTags('Start Form')
export class StartFormController {
  constructor(private readonly startFormService: StartFormService) {}

  @Get(':slug')
  @ApiParam({
    description: 'Template shared-link slug.',
    name: 'slug',
  })
  @ApiOperation({
    description:
      'Returns the public shared-link start form metadata for a template, including required contact methods and verification state.',
    summary: 'Get public shared-link start form',
  })
  @ApiOkResponse({ type: StartFormResponseDto })
  show(@Param('slug') slug: string): Promise<StartFormResponseDto> {
    return this.startFormService.getStartForm(slug);
  }

  @Post(':slug')
  @ApiParam({
    description: 'Template shared-link slug.',
    name: 'slug',
  })
  @ApiOperation({
    description:
      'Creates or reuses a submitter for a shared-link template and returns the public signing URL when verification requirements are satisfied.',
    summary: 'Create or open a shared-link signing form',
  })
  @ApiOkResponse({ type: StartFormSubmitResponseDto })
  submit(
    @Param('slug') slug: string,
    @Body() body: SubmitStartFormDto,
    @Req() request: Request,
  ): Promise<StartFormSubmitResponseDto> {
    return this.startFormService.submitStartForm(
      slug,
      body,
      getStartFormRequestMetadata(request),
    );
  }

  @Post(':slug/email-verification/send')
  @ApiParam({
    description: 'Template shared-link slug.',
    name: 'slug',
  })
  @ApiOperation({
    description:
      'Sends a short-lived verification code before allowing access to a shared-link signing form that requires email verification.',
    summary: 'Send shared-link email verification code',
  })
  @ApiOkResponse({ type: StartFormVerificationResponseDto })
  sendEmailVerification(
    @Param('slug') slug: string,
    @Body() body: SendStartFormEmailVerificationDto,
  ): Promise<StartFormVerificationResponseDto> {
    return this.startFormService.sendEmailVerification(slug, body);
  }

  @Post(':slug/email-verification/check')
  @ApiParam({
    description: 'Template shared-link slug.',
    name: 'slug',
  })
  @ApiOperation({
    description:
      'Validates the shared-link verification code and returns the signing URL for the verified submitter.',
    summary: 'Verify shared-link email code and open signing',
  })
  @ApiOkResponse({ type: StartFormSubmitResponseDto })
  checkEmailVerification(
    @Param('slug') slug: string,
    @Body() body: VerifyStartFormEmailVerificationDto,
    @Req() request: Request,
  ): Promise<StartFormSubmitResponseDto> {
    return this.startFormService.verifyEmailAndSubmitStartForm(
      slug,
      body,
      getStartFormRequestMetadata(request),
    );
  }
}

function getStartFormRequestMetadata(request: Request): {
  ip?: string;
  ua?: string;
} {
  return {
    ip: request.ip,
    ua: request.get('user-agent'),
  };
}
