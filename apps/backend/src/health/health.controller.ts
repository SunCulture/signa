import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ type: HealthResponseDto })
  async check(@Res({ passthrough: true }) response: Response) {
    return this.withStatusCode(response, await this.health.ready());
  }

  @Get('live')
  @ApiOkResponse({ type: HealthResponseDto })
  live(): Promise<HealthResponseDto> {
    return this.health.live();
  }

  @Get('ready')
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ type: HealthResponseDto })
  async ready(@Res({ passthrough: true }) response: Response) {
    return this.withStatusCode(response, await this.health.ready());
  }

  @Get('details')
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ type: HealthResponseDto })
  async detailed(@Res({ passthrough: true }) response: Response) {
    return this.withStatusCode(response, await this.health.detailed());
  }

  private withStatusCode(
    response: Response,
    body: HealthResponseDto,
  ): HealthResponseDto {
    if (body.status === 'error') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return body;
  }
}
