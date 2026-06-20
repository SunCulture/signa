import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
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
import { ApiOrJwtGuard } from '../auth/guards/api-or-jwt/api-or-jwt.guard';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { UploadedBufferFile } from '../storage/storage.types';
import { User } from '../users/entities/user.entity';
import { CreateSubmissionFromPdfDto } from './dto/create-submission-from-pdf.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { DeleteSubmissionQueryDto } from './dto/delete-submission-query.dto';
import { ListSubmissionsQueryDto } from './dto/list-submissions-query.dto';
import {
  SubmissionDeleteResponseDto,
  SubmissionDocumentsResponseDto,
  SubmissionResponseDto,
  SubmissionSubmitterResponseDto,
  SubmissionsListResponseDto,
} from './dto/submission-response.dto';
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

  @Get(':id/documents')
  @ApiOkResponse({ type: SubmissionDocumentsResponseDto })
  getSubmissionDocuments(
    @CurrentUser() user: User,
    @Param('id') submissionId: string,
  ): Promise<SubmissionDocumentsResponseDto> {
    return this.submissionsService.getSubmissionDocuments(user, submissionId);
  }

  @Post()
  @ApiOkResponse({ type: [SubmissionSubmitterResponseDto] })
  createSubmission(
    @CurrentUser() user: User,
    @Body() body: CreateSubmissionDto,
  ): Promise<SubmissionSubmitterResponseDto[]> {
    return this.submissionsService.createSubmission(user, body);
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
  ): Promise<SubmissionSubmitterResponseDto[]> {
    return this.submissionsService.createSubmissionFromPdf(user, body, files);
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
