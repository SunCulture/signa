import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
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
import type { Request } from 'express';
import { ApiOrJwtGuard } from '../auth/guards/api-or-jwt/api-or-jwt.guard';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import type { SubmissionRequestMetadata } from '../submissions/submission-event-data';
import { User } from '../users/entities/user.entity';
import { ListSubmittersQueryDto } from './dto/list-submitters-query.dto';
import {
  SubmitterResponseDto,
  SubmittersListResponseDto,
} from './dto/submitter-response.dto';
import { UpdateSubmitterDto } from './dto/update-submitter.dto';
import { SubmittersService } from './submitters.service';

@Controller('submitters')
@UseGuards(ApiOrJwtGuard, UserHydrationGuard)
@ApiTags('Submitters')
@ApiBearerAuth()
@ApiSecurity('X-Auth-Token')
export class SubmittersController {
  constructor(private readonly submittersService: SubmittersService) {}

  @Get()
  @ApiQuery({ name: 'submission_id', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'slug', required: false })
  @ApiQuery({ name: 'completed_after', required: false })
  @ApiQuery({ name: 'completed_before', required: false })
  @ApiQuery({ name: 'external_id', required: false })
  @ApiQuery({ name: 'application_key', required: false })
  @ApiQuery({ name: 'template_id', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'after', required: false })
  @ApiQuery({ name: 'before', required: false })
  @ApiQuery({ name: 'include', required: false })
  @ApiOperation({
    description:
      'Returns account-scoped submitters with DocuSeal-compatible filters for submission, template, slug, external id, completion date, and search.',
    summary: 'List submitters',
  })
  @ApiOkResponse({ type: SubmittersListResponseDto })
  listSubmitters(
    @CurrentUser() user: User,
    @Query() query: ListSubmittersQueryDto,
  ): Promise<SubmittersListResponseDto> {
    return this.submittersService.listSubmitters(user, query);
  }

  @Get(':id')
  @ApiQuery({ name: 'include', required: false })
  @ApiParam({
    description: 'Submitter id returned by a submission create/list response.',
    name: 'id',
  })
  @ApiOperation({
    description:
      'Returns one submitter with values, documents, signing URL, template summary, and optional field/event includes.',
    summary: 'Get a submitter',
  })
  @ApiOkResponse({ type: SubmitterResponseDto })
  getSubmitter(
    @CurrentUser() user: User,
    @Param('id') submitterId: string,
    @Query('include') include?: string,
  ): Promise<SubmitterResponseDto> {
    return this.submittersService.getSubmitter(user, submitterId, include);
  }

  @Put(':id')
  @ApiQuery({ name: 'include', required: false })
  @ApiParam({ description: 'Submitter id.', name: 'id' })
  @ApiOperation({
    description:
      'Updates submitter contact details, metadata, values, readonly fields, field overrides, delivery flags, and optional completion state.',
    summary: 'Update a submitter',
  })
  @ApiOkResponse({ type: SubmitterResponseDto })
  updateSubmitter(
    @CurrentUser() user: User,
    @Param('id') submitterId: string,
    @Body() body: UpdateSubmitterDto,
    @Query('include') include?: string,
    @Req() request?: Request,
  ): Promise<SubmitterResponseDto> {
    return this.submittersService.updateSubmitter(
      user,
      submitterId,
      body,
      include,
      getSubmissionRequestMetadata(request),
    );
  }
}

function getSubmissionRequestMetadata(
  request: Request | undefined,
): SubmissionRequestMetadata {
  return {
    ip: request?.ip,
    ua: request?.get('user-agent'),
  };
}
