import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get public shared-link start form' })
  @ApiOkResponse({ type: StartFormResponseDto })
  show(@Param('slug') slug: string): Promise<StartFormResponseDto> {
    return this.startFormService.getStartForm(slug);
  }

  @Post(':slug')
  @ApiOperation({ summary: 'Create or open a shared-link signing form' })
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
  @ApiOperation({ summary: 'Send shared-link email verification code' })
  @ApiOkResponse({ type: StartFormVerificationResponseDto })
  sendEmailVerification(
    @Param('slug') slug: string,
    @Body() body: SendStartFormEmailVerificationDto,
  ): Promise<StartFormVerificationResponseDto> {
    return this.startFormService.sendEmailVerification(slug, body);
  }

  @Post(':slug/email-verification/check')
  @ApiOperation({ summary: 'Verify shared-link email code and open signing' })
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
