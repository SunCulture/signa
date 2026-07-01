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
  ApiOperation,
  ApiParam,
  ApiQuery,
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
  @ApiOperation({
    description:
      'Returns configured webhook URLs, selected event types, and HMAC secret metadata for the authenticated account.',
    summary: 'List webhook URLs',
  })
  @ApiOkResponse({ type: WebhookUrlsListResponseDto })
  list(@CurrentUser() user: User): Promise<WebhookUrlsListResponseDto> {
    return this.webhooksService.listWebhooks(user);
  }

  @Post()
  @ApiOperation({
    description:
      'Creates a webhook URL. Delivery attempts are signed with X-Docuseal-Signature-compatible HMAC headers.',
    summary: 'Create a webhook URL',
  })
  @ApiOkResponse({ type: WebhookUrlResponseDto })
  create(
    @CurrentUser() user: User,
    @Body() body: CreateWebhookUrlDto,
  ): Promise<WebhookUrlResponseDto> {
    return this.webhooksService.createWebhook(user, body);
  }

  @Get(':id')
  @ApiParam({ description: 'Webhook URL id.', name: 'id' })
  @ApiOperation({
    description: 'Returns one webhook URL configuration and its HMAC secret.',
    summary: 'Get a webhook URL',
  })
  @ApiOkResponse({ type: WebhookUrlResponseDto })
  get(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<WebhookUrlResponseDto> {
    return this.webhooksService.getWebhook(user, id);
  }

  @Patch(':id')
  @ApiParam({ description: 'Webhook URL id.', name: 'id' })
  @ApiOperation({
    description:
      'Updates the webhook endpoint URL, selected event types, or custom secret/header metadata.',
    summary: 'Update a webhook URL',
  })
  @ApiOkResponse({ type: WebhookUrlResponseDto })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: UpdateWebhookUrlDto,
  ): Promise<WebhookUrlResponseDto> {
    return this.webhooksService.updateWebhook(user, id, body);
  }

  @Delete(':id')
  @ApiParam({ description: 'Webhook URL id.', name: 'id' })
  @ApiOperation({
    description:
      'Archives a webhook URL so future account events are no longer delivered to it.',
    summary: 'Delete a webhook URL',
  })
  @ApiOkResponse({ type: WebhookUrlResponseDto })
  delete(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<WebhookUrlResponseDto> {
    return this.webhooksService.deleteWebhook(user, id);
  }

  @Get(':id/events')
  @ApiParam({ description: 'Webhook URL id.', name: 'id' })
  @ApiQuery({
    description: 'Filter delivery events by status.',
    enum: ['success', 'error', 'pending'],
    name: 'status',
    required: false,
  })
  @ApiQuery({
    description: 'Maximum number of events to return.',
    name: 'limit',
    required: false,
    type: Number,
  })
  @ApiOperation({
    description:
      'Returns queued, successful, and failed webhook delivery events with attempt response details.',
    summary: 'List webhook delivery events',
  })
  @ApiOkResponse({ type: WebhookEventsListResponseDto })
  events(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query() query: ListWebhookEventsQueryDto,
  ): Promise<WebhookEventsListResponseDto> {
    return this.webhooksService.listWebhookEvents(user, id, query);
  }

  @Post(':id/test')
  @ApiParam({ description: 'Webhook URL id.', name: 'id' })
  @ApiOperation({
    description:
      'Queues a test webhook delivery so an integration can verify endpoint reachability and signature validation.',
    summary: 'Send a test webhook',
  })
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
  @ApiParam({ description: 'Webhook event id.', name: 'id' })
  @ApiOperation({
    description:
      'Queues another delivery attempt for a previously persisted webhook event.',
    summary: 'Resend a webhook event',
  })
  @ApiOkResponse({ type: WebhookTestResponseDto })
  async resend(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<WebhookTestResponseDto> {
    await this.webhooksService.resendWebhookEvent(user, id);
    return { queued: true };
  }
}
