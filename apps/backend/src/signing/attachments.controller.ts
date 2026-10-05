import {
  Body,
  Controller,
  Headers,
  Post,
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
import type { UploadedBufferFile } from '../storage/storage.types';
import { AmtOtpGateService } from './amt-otp-gate/amt-otp-gate.service';
import { readGateToken } from './amt-otp-gate/amt-otp-gate.policy';
import { AttachmentUploadResponseDto } from './dto/attachment-upload-response.dto';
import { SigningService } from './signing.service';

@Controller('attachments')
@ApiTags('Attachments')
export class AttachmentsController {
  constructor(
    private readonly signingService: SigningService,
    private readonly amtOtpGate: AmtOtpGateService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'DocuSeal-compatible multipart attachment upload. The returned attachment UUID can be used as a file/image/signature field value.',
    schema: {
      type: 'object',
      required: ['file', 'submitter_slug'],
      properties: {
        file: { type: 'string', format: 'binary' },
        remember_signature: { type: 'string', example: 'false' },
        submitter_slug: { type: 'string', example: 'dsEeWrhRD8yDXT' },
        type: { type: 'string', example: 'signature' },
      },
    },
  })
  @ApiOperation({
    description:
      'Uploads an attachment for a public submitter using the submitter slug. This endpoint supports API-style upload-then-reference workflows.',
    summary: 'Upload public submitter attachment',
  })
  @ApiOkResponse({ type: AttachmentUploadResponseDto })
  async uploadAttachment(
    @Body('submitter_slug') submitterSlug: string,
    @UploadedFile() file: UploadedBufferFile,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body('type') type?: string,
  ): Promise<AttachmentUploadResponseDto> {
    await this.amtOtpGate.assertPassedForSlug(
      submitterSlug,
      readGateToken(headers),
      { checkCurrent: false },
    );
    return this.signingService.uploadApiAttachment(submitterSlug, file, type);
  }
}
