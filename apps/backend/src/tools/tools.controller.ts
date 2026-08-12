import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiOrJwtGuard } from '../auth/guards/api-or-jwt/api-or-jwt.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import type { UploadedBufferFile } from '../storage/storage.types';
import {
  MergePdfsDto,
  MergePdfsResponseDto,
  VerifyPdfDto,
  VerifyPdfResponseDto,
} from './dto/tools.dto';
import { ToolsService } from './tools.service';

@Controller('tools')
@UseGuards(ApiOrJwtGuard, UserHydrationGuard)
@ApiTags('Tools')
@ApiBearerAuth()
@ApiSecurity('X-Auth-Token')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Post('merge')
  @ApiOperation({
    description:
      'Merges two or more base64-encoded PDFs into one base64-encoded PDF using the same PDF merge path as completed document generation.',
    summary: 'Merge PDF files',
  })
  @ApiOkResponse({ type: MergePdfsResponseDto })
  merge(@Body() body: MergePdfsDto): Promise<MergePdfsResponseDto> {
    return this.toolsService.merge(body);
  }

  @Post('verify')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    description:
      'Upload a PDF as multipart/form-data with field name "file", or send JSON with a base64-encoded file property.',
    schema: {
      oneOf: [
        {
          type: 'object',
          required: ['file'],
          properties: {
            file: { type: 'string', format: 'binary' },
          },
        },
        {
          type: 'object',
          required: ['file'],
          properties: {
            file: {
              type: 'string',
              description: 'Base64-encoded PDF for API compatibility.',
            },
          },
        },
      ],
    },
  })
  @ApiOperation({
    description:
      'Verifies a completed Signa PDF by checksum and inspects embedded PDF signature dictionaries, ByteRange data, PAdES SubFilter, signer name, signing reason, signing time, and RFC3161 timestamp entries.',
    summary: 'Verify a signed PDF',
  })
  @ApiOkResponse({ type: VerifyPdfResponseDto })
  verify(
    @Body() body: VerifyPdfDto,
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file?: UploadedBufferFile,
  ): Promise<VerifyPdfResponseDto> {
    return this.toolsService.verify({
      accountId: request.session?.accountId ?? request.tenant?.accountId,
      file: file?.buffer ?? body,
    });
  }
}
