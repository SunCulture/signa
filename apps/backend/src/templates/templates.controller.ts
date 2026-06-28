import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
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
import { User } from '../users/entities/user.entity';
import { UploadedBufferFile } from '../storage/storage.types';
import { CloneTemplateDto } from './dto/clone-template.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateTemplateFolderDto } from './dto/create-template-folder.dto';
import { CreateTemplateFromDocxDto } from './dto/create-template-from-docx.dto';
import { CreateTemplateFromHtmlDto } from './dto/create-template-from-html.dto';
import { CreateTemplateFromPdfDto } from './dto/create-template-from-pdf.dto';
import { DeleteTemplateFolderQueryDto } from './dto/delete-template-folder-query.dto';
import { DeleteTemplateQueryDto } from './dto/delete-template-query.dto';
import { ListTemplateFoldersQueryDto } from './dto/list-template-folders-query.dto';
import { ListTemplatesQueryDto } from './dto/list-templates-query.dto';
import { MergeTemplatesDto } from './dto/merge-templates.dto';
import { TemplateEventsListResponseDto } from './dto/template-event-response.dto';
import { TemplateFolderResponseDto } from './dto/template-folder-response.dto';
import { TemplateDeleteResponseDto } from './dto/template-delete-response.dto';
import { TemplateDocumentsUpdateResponseDto } from './dto/template-documents-update-response.dto';
import { TemplateResponseDto } from './dto/template-response.dto';
import { TemplateUpdateResponseDto } from './dto/template-update-response.dto';
import { TemplateVersionsListResponseDto } from './dto/template-version-response.dto';
import { TemplatesListResponseDto } from './dto/templates-list-response.dto';
import { UpdateTemplateFolderDto } from './dto/update-template-folder.dto';
import { UpdateTemplateDocumentsDto } from './dto/update-template-documents.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplatesService } from './templates.service';

@Controller('templates')
@UseGuards(ApiOrJwtGuard, UserHydrationGuard)
@ApiTags('Templates')
@ApiBearerAuth()
@ApiSecurity('X-Auth-Token')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'slug', required: false })
  @ApiQuery({ name: 'external_id', required: false })
  @ApiQuery({ name: 'application_key', required: false })
  @ApiQuery({ name: 'folder', required: false })
  @ApiQuery({ name: 'archived', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'after', required: false })
  @ApiQuery({ name: 'before', required: false })
  @ApiOkResponse({ type: TemplatesListResponseDto })
  listTemplates(
    @CurrentUser() user: User,
    @Query() query: ListTemplatesQueryDto,
  ): Promise<TemplatesListResponseDto> {
    return this.templatesService.listTemplates(user, query);
  }

  @Get('folders')
  @ApiQuery({ name: 'parent', required: false })
  @ApiQuery({ name: 'q', required: false })
  @ApiOkResponse({ type: [TemplateFolderResponseDto] })
  listFolders(
    @CurrentUser() user: User,
    @Query() query: ListTemplateFoldersQueryDto,
  ): Promise<TemplateFolderResponseDto[]> {
    return this.templatesService.listFolders(user, query);
  }

  @Post('folders')
  @ApiOkResponse({ type: TemplateFolderResponseDto })
  createFolder(
    @CurrentUser() user: User,
    @Body() body: CreateTemplateFolderDto,
  ): Promise<TemplateFolderResponseDto> {
    return this.templatesService.createFolder(user, body);
  }

  @Post()
  @ApiOkResponse({ type: TemplateResponseDto })
  createTemplate(
    @CurrentUser() user: User,
    @Body() body: CreateTemplateDto,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.createTemplate(user, body);
  }

  @Put('folders/:id')
  @ApiOkResponse({ type: TemplateFolderResponseDto })
  updateFolder(
    @CurrentUser() user: User,
    @Param('id') folderId: string,
    @Body() body: UpdateTemplateFolderDto,
  ): Promise<TemplateFolderResponseDto> {
    return this.templatesService.updateFolder(user, folderId, body);
  }

  @Delete('folders/:id')
  @ApiOkResponse({ schema: { nullable: true } })
  deleteFolder(
    @CurrentUser() user: User,
    @Param('id') folderId: string,
    @Query() query: DeleteTemplateFolderQueryDto,
  ): Promise<null> {
    return this.templatesService.deleteFolder(user, folderId, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: TemplateResponseDto })
  getTemplate(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.getTemplate(user, templateId);
  }

  @Get(':id/events')
  @ApiOkResponse({ type: TemplateEventsListResponseDto })
  listTemplateEvents(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
  ): Promise<TemplateEventsListResponseDto> {
    return this.templatesService.listTemplateEvents(user, templateId);
  }

  @Get(':id/versions')
  @ApiOkResponse({ type: TemplateVersionsListResponseDto })
  listTemplateVersions(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
  ): Promise<TemplateVersionsListResponseDto> {
    return this.templatesService.listTemplateVersions(user, templateId);
  }

  @Post('pdf')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'documents' },
      { name: 'files' },
      { name: 'file', maxCount: 1 },
    ]),
  )
  @ApiOkResponse({ type: TemplateResponseDto })
  createTemplateFromPdf(
    @CurrentUser() user: User,
    @Body() body: CreateTemplateFromPdfDto,
    @UploadedFiles()
    files?: Record<string, UploadedBufferFile[]>,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.createTemplateFromPdf(user, body, files);
  }

  @Post('html')
  @ApiOkResponse({ type: TemplateResponseDto })
  createTemplateFromHtml(
    @CurrentUser() user: User,
    @Body() body: CreateTemplateFromHtmlDto,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.createTemplateFromHtml(user, body);
  }

  @Post('docx')
  @ApiOkResponse({ type: TemplateResponseDto })
  createTemplateFromDocx(
    @CurrentUser() user: User,
    @Body() body: CreateTemplateFromDocxDto,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.createTemplateFromDocx(user, body);
  }

  @Post('merge')
  @ApiOkResponse({ type: TemplateResponseDto })
  mergeTemplates(
    @CurrentUser() user: User,
    @Body() body: MergeTemplatesDto,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.mergeTemplates(user, body);
  }

  @Post(':id/clone')
  @ApiOkResponse({ type: TemplateResponseDto })
  cloneTemplate(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
    @Body() body: CloneTemplateDto,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.cloneTemplate(user, templateId, body);
  }

  @Put(':id')
  @ApiOkResponse({ type: TemplateUpdateResponseDto })
  updateTemplate(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
    @Body() body: UpdateTemplateDto,
  ): Promise<TemplateUpdateResponseDto> {
    return this.templatesService.updateTemplate(user, templateId, body);
  }

  @Get(':id/documents')
  @ApiOkResponse({
    schema: {
      items: { type: 'string' },
      type: 'array',
    },
  })
  getTemplateDocuments(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
  ): Promise<string[]> {
    return this.templatesService.getTemplateDocumentDownloadUrls(
      user,
      templateId,
    );
  }

  @Put(':id/documents')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'documents' },
      { name: 'files' },
      { name: 'file', maxCount: 1 },
    ]),
  )
  @ApiOkResponse({ type: TemplateDocumentsUpdateResponseDto })
  updateTemplateDocuments(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
    @Body() body: UpdateTemplateDocumentsDto,
    @UploadedFiles()
    files?: Record<string, UploadedBufferFile[]>,
  ): Promise<TemplateDocumentsUpdateResponseDto> {
    return this.templatesService.updateTemplateDocuments(
      user,
      templateId,
      body,
      files,
    );
  }

  @Delete(':id')
  @ApiOkResponse({ type: TemplateDeleteResponseDto })
  deleteTemplate(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
    @Query() query: DeleteTemplateQueryDto,
  ): Promise<TemplateDeleteResponseDto> {
    return this.templatesService.deleteTemplate(user, templateId, query);
  }
}
