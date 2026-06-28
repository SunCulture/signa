import {
  Body,
  Controller,
  Post,
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
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiOrJwtGuard } from '../auth/guards/api-or-jwt/api-or-jwt.guard';
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
  @ApiOkResponse({ type: MergePdfsResponseDto })
  merge(@Body() body: MergePdfsDto): Promise<MergePdfsResponseDto> {
    return this.toolsService.merge(body);
  }

  @Post('verify')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
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
  @ApiOkResponse({ type: VerifyPdfResponseDto })
  verify(
    @Body() body: VerifyPdfDto,
    @UploadedFile() file?: UploadedBufferFile,
  ): Promise<VerifyPdfResponseDto> {
    return this.toolsService.verify(file?.buffer ?? body);
  }
}
