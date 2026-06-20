import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { ApiResponse } from '@repo/shared';
import { AppService } from './app.service';

type ApiInfo = {
  message: string;
  name: 'signa';
  version: string;
};

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOkResponse({ description: 'API service metadata' })
  getInfo(): ApiResponse<ApiInfo> {
    return {
      data: {
        message: this.appService.getHello(),
        name: 'signa',
        version: '0.1.0',
      },
      error: null,
    };
  }
}
