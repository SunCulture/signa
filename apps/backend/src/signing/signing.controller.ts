import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
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
import {
  DeclineSigningDto,
  UpdateSigningValuesDto,
} from './dto/signing-request.dto';
import {
  SigningAttachmentDto,
  SigningDownloadResponseDto,
  SigningFieldValueResponseDto,
  SigningResponseDto,
} from './dto/signing-response.dto';
import { SigningService } from './signing.service';

@Controller('signing')
@ApiTags('Signing')
export class SigningController {
  constructor(private readonly signingService: SigningService) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get public signing form by submitter slug' })
  @ApiOkResponse({ type: SigningResponseDto })
  getSigningForm(@Param('slug') slug: string): Promise<SigningResponseDto> {
    return this.signingService.getSigningForm(slug);
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
  ): Promise<SigningResponseDto> {
    return this.signingService.updateValues(slug, body);
  }

  @Post(':slug/complete')
  @ApiOperation({ summary: 'Complete public signing form' })
  @ApiOkResponse({ type: SigningResponseDto })
  complete(
    @Param('slug') slug: string,
    @Body() body: UpdateSigningValuesDto,
  ): Promise<SigningResponseDto> {
    return this.signingService.updateValues(slug, {
      ...body,
      completed: true,
    });
  }

  @Post(':slug/decline')
  @ApiOperation({ summary: 'Decline public signing form' })
  @ApiOkResponse({ type: SigningResponseDto })
  decline(
    @Param('slug') slug: string,
    @Body() body: DeclineSigningDto,
  ): Promise<SigningResponseDto> {
    return this.signingService.decline(slug, body);
  }

  @Get(':slug/download')
  @ApiOperation({ summary: 'Get public signing form download URLs' })
  @ApiOkResponse({ type: SigningDownloadResponseDto })
  download(@Param('slug') slug: string): Promise<SigningDownloadResponseDto> {
    return this.signingService.getDownload(slug);
  }
}
