import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiOrJwtGuard } from '../auth/guards/api-or-jwt/api-or-jwt.guard';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { User } from '../users/entities/user.entity';
import {
  CreateWebhookUrlDto,
  ListWebhookEventsQueryDto,
  UpdateWebhookUrlDto,
  WebhookEventsListResponseDto,
  WebhookTestResponseDto,
  WebhookUrlResponseDto,
  WebhookUrlsListResponseDto,
} from './dto/webhook-url.dto';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
@UseGuards(ApiOrJwtGuard, UserHydrationGuard)
@ApiTags('Webhooks')
@ApiBearerAuth()
@ApiSecurity('X-Auth-Token')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @ApiOkResponse({ type: WebhookUrlsListResponseDto })
  list(@CurrentUser() user: User): Promise<WebhookUrlsListResponseDto> {
    return this.webhooksService.listWebhooks(user);
  }

  @Post()
  @ApiOkResponse({ type: WebhookUrlResponseDto })
  create(
    @CurrentUser() user: User,
    @Body() body: CreateWebhookUrlDto,
  ): Promise<WebhookUrlResponseDto> {
    return this.webhooksService.createWebhook(user, body);
  }

  @Get(':id')
  @ApiOkResponse({ type: WebhookUrlResponseDto })
  get(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<WebhookUrlResponseDto> {
    return this.webhooksService.getWebhook(user, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: WebhookUrlResponseDto })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: UpdateWebhookUrlDto,
  ): Promise<WebhookUrlResponseDto> {
    return this.webhooksService.updateWebhook(user, id, body);
  }

  @Delete(':id')
  @ApiOkResponse({ type: WebhookUrlResponseDto })
  delete(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<WebhookUrlResponseDto> {
    return this.webhooksService.deleteWebhook(user, id);
  }

  @Get(':id/events')
  @ApiOkResponse({ type: WebhookEventsListResponseDto })
  events(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query() query: ListWebhookEventsQueryDto,
  ): Promise<WebhookEventsListResponseDto> {
    return this.webhooksService.listWebhookEvents(user, id, query);
  }

  @Post(':id/test')
  @ApiOkResponse({ type: WebhookTestResponseDto })
  async test(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<WebhookTestResponseDto> {
    await this.webhooksService.testWebhook(user, id);
    return { queued: true };
  }
}

@Controller('webhook-events')
@UseGuards(ApiOrJwtGuard, UserHydrationGuard)
@ApiTags('Webhook Events')
@ApiBearerAuth()
@ApiSecurity('X-Auth-Token')
export class WebhookEventsController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post(':id/resend')
  @ApiOkResponse({ type: WebhookTestResponseDto })
  async resend(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<WebhookTestResponseDto> {
    await this.webhooksService.resendWebhookEvent(user, id);
    return { queued: true };
  }
}
