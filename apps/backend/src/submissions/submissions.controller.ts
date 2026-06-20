import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiOrJwtGuard } from '../auth/guards/api-or-jwt/api-or-jwt.guard';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { UploadedBufferFile } from '../storage/storage.types';
import type { SubmissionRequestMetadata } from './submission-event-data';
import { User } from '../users/entities/user.entity';
import { CreateSubmissionFromPdfDto } from './dto/create-submission-from-pdf.dto';
import {
  CreateSubmissionAliasDto,
  CreateSubmissionDto,
} from './dto/create-submission.dto';
import { DeleteSubmissionQueryDto } from './dto/delete-submission-query.dto';
import { EventFeedResponseDto } from './dto/event-feed-response.dto';
import { ListSubmissionsQueryDto } from './dto/list-submissions-query.dto';
import { SendEmailResponseDto } from './dto/send-email-response.dto';
import { SubmissionInitResponseDto } from './dto/submission-init-response.dto';
import {
  SubmissionDeleteResponseDto,
  SubmissionDocumentsResponseDto,
  SubmissionResponseDto,
  SubmissionSubmitterResponseDto,
  SubmissionsListResponseDto,
} from './dto/submission-response.dto';
import { SubmissionEventLogResponseDto } from './dto/submission-event-log-response.dto';
import { SubmissionsService } from './submissions.service';

@Controller('submissions')
@UseGuards(ApiOrJwtGuard, UserHydrationGuard)
@ApiTags('Submissions')
@ApiBearerAuth()
@ApiSecurity('X-Auth-Token')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @ApiQuery({ name: 'template_id', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'completed', 'declined', 'expired'],
  })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'slug', required: false })
  @ApiQuery({ name: 'template_folder', required: false })
  @ApiQuery({ name: 'archived', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'after', required: false })
  @ApiQuery({ name: 'before', required: false })
  @ApiQuery({ name: 'include', required: false })
  @ApiOkResponse({ type: SubmissionsListResponseDto })
  listSubmissions(
    @CurrentUser() user: User,
    @Query() query: ListSubmissionsQueryDto,
  ): Promise<SubmissionsListResponseDto> {
    return this.submissionsService.listSubmissions(user, query);
  }

  @Get(':id')
  @ApiQuery({ name: 'include', required: false })
  @ApiOkResponse({ type: SubmissionResponseDto })
  getSubmission(
    @CurrentUser() user: User,
    @Param('id') submissionId: string,
    @Query('include') include?: string,
  ): Promise<SubmissionResponseDto> {
    return this.submissionsService.getSubmission(user, submissionId, include);
  }

  @Get(':id/events')
  @ApiOkResponse({ type: SubmissionEventLogResponseDto })
  getSubmissionEvents(
    @CurrentUser() user: User,
    @Param('id') submissionId: string,
  ): Promise<SubmissionEventLogResponseDto> {
    return this.submissionsService.getSubmissionEvents(user, submissionId);
  }

  @Get(':id/documents')
  @ApiOkResponse({ type: SubmissionDocumentsResponseDto })
  getSubmissionDocuments(
    @CurrentUser() user: User,
    @Param('id') submissionId: string,
    @Query('merge') merge?: string,
  ): Promise<SubmissionDocumentsResponseDto> {
    return this.submissionsService.getSubmissionDocuments(user, submissionId, {
      merge: merge === 'true',
    });
  }

  @Post()
  @ApiOkResponse({ type: [SubmissionSubmitterResponseDto] })
  createSubmission(
    @CurrentUser() user: User,
    @Body() body: CreateSubmissionDto,
    @Req() request: Request,
  ): Promise<SubmissionSubmitterResponseDto[]> {
    return this.submissionsService.createSubmission(
      user,
      body,
      getSubmissionRequestMetadata(request),
    );
  }

  @Post('emails')
  @ApiOkResponse({ type: [SubmissionSubmitterResponseDto] })
  createSubmissionFromEmails(
    @CurrentUser() user: User,
    @Body() body: CreateSubmissionAliasDto,
    @Req() request: Request,
  ): Promise<SubmissionSubmitterResponseDto[]> {
    return this.submissionsService.createSubmissionFromAlias(
      user,
      body,
      getSubmissionRequestMetadata(request),
    );
  }

  @Post('init')
  @ApiOkResponse({ type: SubmissionInitResponseDto })
  initSubmission(
    @CurrentUser() user: User,
    @Body() body: CreateSubmissionAliasDto,
    @Req() request: Request,
  ): Promise<SubmissionInitResponseDto> {
    return this.submissionsService.createSubmissionInit(
      user,
      body,
      getSubmissionRequestMetadata(request),
    );
  }

  @Post('pdf')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'documents' },
      { name: 'files' },
      { name: 'file', maxCount: 1 },
    ]),
  )
  @ApiOkResponse({ type: [SubmissionSubmitterResponseDto] })
  createSubmissionFromPdf(
    @CurrentUser() user: User,
    @Body() body: CreateSubmissionFromPdfDto,
    @UploadedFiles()
    files?: Record<string, UploadedBufferFile[]>,
    @Req() request?: Request,
  ): Promise<SubmissionSubmitterResponseDto[]> {
    return this.submissionsService.createSubmissionFromPdf(
      user,
      body,
      files,
      getSubmissionRequestMetadata(request),
    );
  }

  @Delete(':id')
  @ApiOkResponse({ type: SubmissionDeleteResponseDto })
  deleteSubmission(
    @CurrentUser() user: User,
    @Param('id') submissionId: string,
    @Query() query: DeleteSubmissionQueryDto,
  ): Promise<SubmissionDeleteResponseDto> {
    return this.submissionsService.deleteSubmission(user, submissionId, query);
  }
}

@Controller('templates/:templateId/submissions')
@UseGuards(ApiOrJwtGuard, UserHydrationGuard)
@ApiTags('Template Submissions')
@ApiBearerAuth()
@ApiSecurity('X-Auth-Token')
export class TemplateSubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @ApiOkResponse({ type: SubmissionsListResponseDto })
  listTemplateSubmissions(
    @CurrentUser() user: User,
    @Param('templateId') templateId: string,
    @Query() query: ListSubmissionsQueryDto,
  ): Promise<SubmissionsListResponseDto> {
    return this.submissionsService.listSubmissions(user, {
      ...query,
      template_id: templateId,
    });
  }

  @Post()
  @ApiOkResponse({ type: [SubmissionSubmitterResponseDto] })
  createTemplateSubmission(
    @CurrentUser() user: User,
    @Param('templateId') templateId: string,
    @Body() body: CreateSubmissionAliasDto,
    @Req() request: Request,
  ): Promise<SubmissionSubmitterResponseDto[]> {
    return this.submissionsService.createSubmissionFromAlias(
      user,
      {
        ...body,
        template_id: templateId,
      },
      getSubmissionRequestMetadata(request),
    );
  }
}

@Controller('events')
@UseGuards(ApiOrJwtGuard, UserHydrationGuard)
@ApiTags('Events')
@ApiBearerAuth()
@ApiSecurity('X-Auth-Token')
export class EventsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get('form/:type')
  @ApiOkResponse({ type: EventFeedResponseDto })
  listFormEvents(
    @CurrentUser() user: User,
    @Param('type') type: string,
    @Query('limit') limit?: string,
    @Query('after') after?: string,
    @Query('before') before?: string,
  ): Promise<EventFeedResponseDto> {
    return this.submissionsService.listFormEvents(user, type, {
      after,
      before,
      limit,
    });
  }

  @Get('submission/:type')
  @ApiOkResponse({ type: EventFeedResponseDto })
  listSubmissionEvents(
    @CurrentUser() user: User,
    @Param('type') type: string,
    @Query('limit') limit?: string,
    @Query('after') after?: string,
    @Query('before') before?: string,
  ): Promise<EventFeedResponseDto> {
    return this.submissionsService.listSubmissionEvents(user, type, {
      after,
      before,
      limit,
    });
  }
}

@Controller()
export class SubmissionMailController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post('submissions/:id/resend_email')
  @UseGuards(ApiOrJwtGuard, UserHydrationGuard)
  @ApiTags('Submission Mail')
  @ApiBearerAuth()
  @ApiSecurity('X-Auth-Token')
  @ApiOkResponse({ type: SendEmailResponseDto })
  resendSubmissionEmail(
    @CurrentUser() user: User,
    @Param('id') submissionId: string,
  ): Promise<SendEmailResponseDto> {
    return this.submissionsService.resendSubmissionEmail(user, submissionId);
  }

  @Post('submitters/:id/send_email')
  @UseGuards(ApiOrJwtGuard, UserHydrationGuard)
  @ApiTags('Submission Mail')
  @ApiBearerAuth()
  @ApiSecurity('X-Auth-Token')
  @ApiOkResponse({ type: SendEmailResponseDto })
  sendSubmitterEmail(
    @CurrentUser() user: User,
    @Param('id') submitterId: string,
  ): Promise<SendEmailResponseDto> {
    return this.submissionsService.sendSubmitterEmail(user, submitterId);
  }

  @Post('send_submission_email')
  @ApiTags('Submission Mail')
  @ApiOkResponse({ type: SendEmailResponseDto })
  sendCompletedSubmissionEmail(
    @Body('submitter_slug') submitterSlug?: string,
    @Body('submission_slug') submissionSlug?: string,
    @Body('template_slug') templateSlug?: string,
    @Body('email') email?: string,
  ): Promise<SendEmailResponseDto> {
    return this.submissionsService.sendCompletedSubmissionEmail({
      email,
      submissionSlug,
      submitterSlug,
      templateSlug,
    });
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
