import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
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
  @ApiOperation({
    description:
      'Returns the same readiness result used by load balancers. A failed dependency changes the HTTP status to 503.',
    summary: 'Check API health',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ type: HealthResponseDto })
  async check(@Res({ passthrough: true }) response: Response) {
    return this.withStatusCode(response, await this.health.ready());
  }

  @Get('live')
  @ApiOperation({
    description:
      'Lightweight liveness probe that confirms the Nest process is running without checking external dependencies.',
    summary: 'Check liveness',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  live(): Promise<HealthResponseDto> {
    return this.health.live();
  }

  @Get('ready')
  @ApiOperation({
    description:
      'Readiness probe for deployment platforms. Checks required runtime dependencies before returning an OK status.',
    summary: 'Check readiness',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ type: HealthResponseDto })
  async ready(@Res({ passthrough: true }) response: Response) {
    return this.withStatusCode(response, await this.health.ready());
  }

  @Get('details')
  @ApiOperation({
    description:
      'Detailed operational health response with database, Redis, mail, storage, queue, and runtime metadata.',
    summary: 'Get detailed health',
  })
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
