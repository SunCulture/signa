import {
  Body,
  Controller,
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
import { AttachmentUploadResponseDto } from './dto/attachment-upload-response.dto';
import { SigningService } from './signing.service';

@Controller('attachments')
@ApiTags('Attachments')
export class AttachmentsController {
  constructor(private readonly signingService: SigningService) {}

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
  uploadAttachment(
    @Body('submitter_slug') submitterSlug: string,
    @UploadedFile() file: UploadedBufferFile,
    @Body('type') type?: string,
  ): Promise<AttachmentUploadResponseDto> {
    return this.signingService.uploadApiAttachment(submitterSlug, file, type);
  }
}
