import { Body, Controller, HttpCode, Param, Post, Req } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { VerifyAmtOtpDto } from '../dto/signing-request.dto';
import { AmtOtpGateTokenResponseDto } from '../dto/signing-response.dto';
import { getSigningRequestMetadata } from '../signing-request-metadata';
import { AmtOtpGateService } from './amt-otp-gate.service';

@Controller('signing')
@ApiTags('Signing')
export class AmtOtpGateController {
  constructor(private readonly gate: AmtOtpGateService) {}

  @Post(':slug/amt-otp/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiParam({ description: 'Public submitter signing slug.', name: 'slug' })
  @ApiOperation({
    description:
      'Checks the code AMT sent an AMT-owned signer, server-to-server against AMT, and returns a short-lived gate token. A wrong, used or superseded code answers 422 with a generic message.',
    summary: 'Verify the AMT access code for a public signing form',
  })
  @ApiOkResponse({ type: AmtOtpGateTokenResponseDto })
  verify(
    @Param('slug') slug: string,
    @Body() body: VerifyAmtOtpDto,
    @Req() request: Request,
  ): Promise<AmtOtpGateTokenResponseDto> {
    return this.gate.verify(
      slug,
      body.code,
      getSigningRequestMetadata(request),
    );
  }
}
