import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ApiResponse } from '@repo/shared';
import { AppService } from './app.service';

type ApiInfo = {
  commit_sha: null | string;
  message: string;
  name: 'signa';
  version: string;
};

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    description:
      'Returns basic API metadata for probes, smoke tests, and SDK bootstrapping.',
    summary: 'Get API metadata',
  })
  @ApiOkResponse({ description: 'API service metadata' })
  getInfo(): ApiResponse<ApiInfo> {
    return {
      data: {
        message: this.appService.getHello(),
        name: 'signa',
        version: this.appService.getVersion(),
        commit_sha: this.appService.getCommitSha(),
      },
      error: null,
    };
  }
}
