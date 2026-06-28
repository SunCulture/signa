import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { UploadedBufferFile } from '../storage/storage.types';
import {
  CreateIdentityVerificationDto,
  CreatePaymentAttemptDto,
  DeclineSigningDto,
  DelegateSigningDto,
  SendEmailVerificationDto,
  SendPhoneVerificationDto,
  UpdateSigningValuesDto,
  VerifyEmailCodeDto,
  VerifyPhoneCodeDto,
} from './dto/signing-request.dto';
import {
  SigningAttachmentDto,
  SigningDownloadResponseDto,
  SigningFieldValueResponseDto,
  SigningResponseDto,
} from './dto/signing-response.dto';
import { SigningRequestMetadata } from './signing-request-metadata';
import { SigningService } from './signing.service';

@Controller('signing')
@ApiTags('Signing')
export class SigningController {
  constructor(private readonly signingService: SigningService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get public signing form by submitter slug' })
  @ApiOkResponse({ type: SigningResponseDto })
  getSigningForm(
    @Param('slug') slug: string,
    @Query('t') trackingParam: string | undefined,
    @Query('c') smsTrackingParam: string | undefined,
    @Req() request: Request,
  ): Promise<SigningResponseDto> {
    return this.signingService.getSigningForm(
      slug,
      getSigningRequestMetadata(request, trackingParam, smsTrackingParam),
    );
  }

  @Get(':slug/values')
  @ApiOperation({ summary: 'Get public signing field value for QR polling' })
  @ApiOkResponse({ type: SigningFieldValueResponseDto })
  getFieldValue(
    @Param('slug') slug: string,
    @Query('field_uuid') fieldUuid: string,
    @Query('after') after?: string,
  ): Promise<SigningFieldValueResponseDto> {
    return this.signingService.getFieldValue(slug, fieldUuid, after);
  }

  @Post(':slug/attachments')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', example: 'signature' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a signing attachment' })
  @ApiOkResponse({ type: SigningAttachmentDto })
  uploadAttachment(
    @Param('slug') slug: string,
    @UploadedFile() file: UploadedBufferFile,
    @Body('type') type?: string,
  ): Promise<SigningAttachmentDto> {
    return this.signingService.uploadAttachment(slug, file, type);
  }

  @Put(':slug/values')
  @ApiOperation({ summary: 'Save public signing form values' })
  @ApiOkResponse({ type: SigningResponseDto })
  updateValues(
    @Param('slug') slug: string,
    @Body() body: UpdateSigningValuesDto,
    @Req() request: Request,
  ): Promise<SigningResponseDto> {
    return this.signingService.updateValues(
      slug,
      body,
      getSigningRequestMetadata(request),
    );
  }

  @Post(':slug/complete')
  @ApiOperation({ summary: 'Complete public signing form' })
  @ApiOkResponse({ type: SigningResponseDto })
  complete(
    @Param('slug') slug: string,
    @Body() body: UpdateSigningValuesDto,
    @Req() request: Request,
  ): Promise<SigningResponseDto> {
    return this.signingService.updateValues(
      slug,
      {
        ...body,
        completed: true,
      },
      getSigningRequestMetadata(request),
    );
  }

  @Post(':slug/decline')
  @ApiOperation({ summary: 'Decline public signing form' })
  @ApiOkResponse({ type: SigningResponseDto })
  decline(
    @Param('slug') slug: string,
    @Body() body: DeclineSigningDto,
    @Req() request: Request,
  ): Promise<SigningResponseDto> {
    return this.signingService.decline(
      slug,
      body,
      getSigningRequestMetadata(request),
    );
  }

  @Post(':slug/delegate')
  @ApiOperation({
    summary: 'Delegate public signing form to another recipient',
  })
  @ApiOkResponse({ type: SigningResponseDto })
  delegate(
    @Param('slug') slug: string,
    @Body() body: DelegateSigningDto,
    @Req() request: Request,
  ): Promise<SigningResponseDto> {
    return this.signingService.delegate(
      slug,
      body,
      getSigningRequestMetadata(request),
    );
  }

  @Post(':slug/resubmit')
  @ApiOperation({ summary: 'Create a fresh public signing form revision' })
  @ApiOkResponse({ type: SigningResponseDto })
  resubmit(
    @Param('slug') slug: string,
    @Req() request: Request,
  ): Promise<SigningResponseDto> {
    return this.signingService.resubmit(
      slug,
      getSigningRequestMetadata(request),
    );
  }

  @Post(':slug/phone-verification/send')
  @ApiOperation({ summary: 'Send public signing phone verification code' })
  @ApiOkResponse({
    schema: {
      properties: {
        phone: { type: 'string' },
        status: { type: 'string' },
      },
    },
  })
  sendPhoneVerification(
    @Param('slug') slug: string,
    @Body() body: SendPhoneVerificationDto,
    @Req() request: Request,
  ): Promise<{ phone: string; status: string }> {
    return this.signingService.sendPhoneVerification(
      slug,
      body,
      getSigningRequestMetadata(request),
    );
  }

  @Post(':slug/phone-verification/validate')
  @ApiOperation({ summary: 'Validate a public signing phone number' })
  @ApiOkResponse({
    schema: {
      properties: {
        phone: { type: 'string' },
        valid: { type: 'boolean' },
      },
    },
  })
  validatePhoneNumber(
    @Param('slug') slug: string,
    @Body() body: SendPhoneVerificationDto,
  ): Promise<{ phone: string; valid: boolean }> {
    return this.signingService.validatePhoneNumber(slug, body);
  }

  @Post(':slug/phone-verification/check')
  @ApiOperation({ summary: 'Verify public signing phone code' })
  @ApiOkResponse({ type: SigningResponseDto })
  verifyPhoneCode(
    @Param('slug') slug: string,
    @Body() body: VerifyPhoneCodeDto,
    @Req() request: Request,
  ): Promise<SigningResponseDto> {
    return this.signingService.verifyPhoneCode(
      slug,
      body,
      getSigningRequestMetadata(request),
    );
  }

  @Post(':slug/email-verification/send')
  @ApiOperation({ summary: 'Send public signing email verification code' })
  @ApiOkResponse({
    schema: {
      properties: {
        email: { type: 'string' },
        status: { type: 'string' },
      },
    },
  })
  sendEmailVerification(
    @Param('slug') slug: string,
    @Body() body: SendEmailVerificationDto,
    @Req() request: Request,
  ): Promise<{ email: string; status: string }> {
    return this.signingService.sendEmailVerification(
      slug,
      body,
      getSigningRequestMetadata(request),
    );
  }

  @Post(':slug/email-verification/check')
  @ApiOperation({ summary: 'Verify public signing email code' })
  @ApiOkResponse({ type: SigningResponseDto })
  verifyEmailCode(
    @Param('slug') slug: string,
    @Body() body: VerifyEmailCodeDto,
    @Req() request: Request,
  ): Promise<SigningResponseDto> {
    return this.signingService.verifyEmailCode(
      slug,
      body,
      getSigningRequestMetadata(request),
    );
  }

  @Post(':slug/payment-attempts')
  @ApiOperation({ summary: 'Record public signing payment attempt state' })
  @ApiOkResponse({
    schema: {
      properties: {
        id: { type: 'string' },
        status: { type: 'string' },
      },
    },
  })
  createPaymentAttempt(
    @Param('slug') slug: string,
    @Body() body: CreatePaymentAttemptDto,
    @Req() request: Request,
  ): Promise<{ id: string; status: string }> {
    return this.signingService.createPaymentAttempt(
      slug,
      body,
      getSigningRequestMetadata(request),
    );
  }

  @Post(':slug/identity-verifications')
  @ApiOperation({
    summary: 'Record public signing identity verification state',
  })
  @ApiOkResponse({
    schema: {
      properties: {
        id: { type: 'string' },
        status: { type: 'string' },
      },
    },
  })
  createIdentityVerification(
    @Param('slug') slug: string,
    @Body() body: CreateIdentityVerificationDto,
    @Req() request: Request,
  ): Promise<{ id: string; status: string }> {
    return this.signingService.createIdentityVerification(
      slug,
      body,
      getSigningRequestMetadata(request),
    );
  }

  @Get(':slug/download')
  @ApiOperation({ summary: 'Get public signing form download URLs' })
  @ApiOkResponse({ type: SigningDownloadResponseDto })
  download(@Param('slug') slug: string): Promise<SigningDownloadResponseDto> {
    return this.signingService.getDownload(slug);
  }
}

function getSigningRequestMetadata(
  request: Request,
  trackingParam?: string,
  smsTrackingParam?: string,
): SigningRequestMetadata {
  return {
    ip: request.ip,
    smsTrackingParam,
    trackingParam,
    ua: request.get('user-agent'),
  };
}
