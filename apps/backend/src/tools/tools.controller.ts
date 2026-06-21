import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiOrJwtGuard } from '../auth/guards/api-or-jwt/api-or-jwt.guard';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
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
  @ApiOkResponse({ type: VerifyPdfResponseDto })
  verify(@Body() body: VerifyPdfDto): Promise<VerifyPdfResponseDto> {
    return this.toolsService.verify(body);
  }
}
