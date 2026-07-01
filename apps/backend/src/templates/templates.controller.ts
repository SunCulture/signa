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
import { UploadedBufferFile } from '../storage/storage.types';
import { CloneTemplateDto } from './dto/clone-template.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateTemplateFolderDto } from './dto/create-template-folder.dto';
import { CreateTemplateFromDocxDto } from './dto/create-template-from-docx.dto';
import { CreateTemplateFromHtmlDto } from './dto/create-template-from-html.dto';
import { CreateTemplateFromPdfDto } from './dto/create-template-from-pdf.dto';
import { DeleteTemplateFolderQueryDto } from './dto/delete-template-folder-query.dto';
import { DeleteTemplateQueryDto } from './dto/delete-template-query.dto';
import { ImportGoogleDriveDocumentsDto } from './dto/google-drive-documents.dto';
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
  @ApiOperation({
    description:
      'Returns account-scoped templates with DocuSeal cursor pagination. Supports search, slug/external id lookup, folder filtering, and archived views.',
    summary: 'List templates',
  })
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
  @ApiOperation({
    description:
      'Lists Signa template folders. Folders are a Signa dashboard extension that follows DocuSeal folder naming conventions.',
    summary: 'List template folders',
  })
  @ApiOkResponse({ type: [TemplateFolderResponseDto] })
  listFolders(
    @CurrentUser() user: User,
    @Query() query: ListTemplateFoldersQueryDto,
  ): Promise<TemplateFolderResponseDto[]> {
    return this.templatesService.listFolders(user, query);
  }

  @Post('folders')
  @ApiOperation({
    description:
      'Creates an account-scoped folder for organizing templates in the dashboard.',
    summary: 'Create a template folder',
  })
  @ApiOkResponse({ type: TemplateFolderResponseDto })
  createFolder(
    @CurrentUser() user: User,
    @Body() body: CreateTemplateFolderDto,
  ): Promise<TemplateFolderResponseDto> {
    return this.templatesService.createFolder(user, body);
  }

  @Post()
  @ApiOperation({
    description:
      'Creates a blank template shell. Upload or import documents later with PUT /templates/{id}/documents or Google Drive import.',
    summary: 'Create a blank template',
  })
  @ApiOkResponse({ type: TemplateResponseDto })
  createTemplate(
    @CurrentUser() user: User,
    @Body() body: CreateTemplateDto,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.createTemplate(user, body);
  }

  @Put('folders/:id')
  @ApiParam({ description: 'Template folder id.', name: 'id' })
  @ApiOperation({
    description:
      'Renames or moves a template folder. Child paths are normalized using the folder full-name convention.',
    summary: 'Update a template folder',
  })
  @ApiOkResponse({ type: TemplateFolderResponseDto })
  updateFolder(
    @CurrentUser() user: User,
    @Param('id') folderId: string,
    @Body() body: UpdateTemplateFolderDto,
  ): Promise<TemplateFolderResponseDto> {
    return this.templatesService.updateFolder(user, folderId, body);
  }

  @Delete('folders/:id')
  @ApiParam({ description: 'Template folder id.', name: 'id' })
  @ApiOperation({
    description:
      'Deletes a folder only or deletes the folder tree with contents, depending on the mode query parameter.',
    summary: 'Delete a template folder',
  })
  @ApiOkResponse({ schema: { nullable: true } })
  deleteFolder(
    @CurrentUser() user: User,
    @Param('id') folderId: string,
    @Query() query: DeleteTemplateFolderQueryDto,
  ): Promise<null> {
    return this.templatesService.deleteFolder(user, folderId, query);
  }

  @Get(':id')
  @ApiParam({
    description: 'Template id returned by list/create template endpoints.',
    name: 'id',
  })
  @ApiOperation({
    description:
      'Returns a template, submitter roles, fields, schema, preferences, author, and document preview/download URLs.',
    summary: 'Get a template',
  })
  @ApiOkResponse({ type: TemplateResponseDto })
  getTemplate(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.getTemplate(user, templateId);
  }

  @Get(':id/events')
  @ApiParam({ description: 'Template id.', name: 'id' })
  @ApiOperation({
    description:
      'Returns Signa template activity events for auditability and change review.',
    summary: 'List template activity events',
  })
  @ApiOkResponse({ type: TemplateEventsListResponseDto })
  listTemplateEvents(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
  ): Promise<TemplateEventsListResponseDto> {
    return this.templatesService.listTemplateEvents(user, templateId);
  }

  @Get(':id/versions')
  @ApiParam({ description: 'Template id.', name: 'id' })
  @ApiOperation({
    description:
      'Returns stored template version snapshots created from tracked template edits.',
    summary: 'List template versions',
  })
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
  @ApiOperation({
    description:
      'Creates a template from PDF documents. Accepts multipart files or DocuSeal-compatible JSON documents with base64/URL file values.',
    summary: 'Create a template from PDF documents',
  })
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
  @ApiOperation({
    description:
      'Creates a template from HTML with DocuSeal field tags. HTML is rendered to PDF and converted into template documents.',
    summary: 'Create a template from HTML',
  })
  @ApiOkResponse({ type: TemplateResponseDto })
  createTemplateFromHtml(
    @CurrentUser() user: User,
    @Body() body: CreateTemplateFromHtmlDto,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.createTemplateFromHtml(user, body);
  }

  @Post('docx')
  @ApiOperation({
    description:
      'Creates a template from DOCX files. Variables are expanded and the resulting documents are rendered to PDF for signing.',
    summary: 'Create a template from DOCX documents',
  })
  @ApiOkResponse({ type: TemplateResponseDto })
  createTemplateFromDocx(
    @CurrentUser() user: User,
    @Body() body: CreateTemplateFromDocxDto,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.createTemplateFromDocx(user, body);
  }

  @Post('merge')
  @ApiOperation({
    description:
      'Creates a new template by combining existing templates, cloning documents, roles, fields, schema, and preferences.',
    summary: 'Merge templates',
  })
  @ApiOkResponse({ type: TemplateResponseDto })
  mergeTemplates(
    @CurrentUser() user: User,
    @Body() body: MergeTemplatesDto,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.mergeTemplates(user, body);
  }

  @Post(':id/clone')
  @ApiParam({ description: 'Template id to clone.', name: 'id' })
  @ApiOperation({
    description:
      'Clones a template with documents, preview attachments, submitters, fields, schema, preferences, and optional folder/external id overrides.',
    summary: 'Clone a template',
  })
  @ApiOkResponse({ type: TemplateResponseDto })
  cloneTemplate(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
    @Body() body: CloneTemplateDto,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.cloneTemplate(user, templateId, body);
  }

  @Put(':id')
  @ApiParam({ description: 'Template id.', name: 'id' })
  @ApiOperation({
    description:
      'Updates template metadata, shared-link settings, roles, fields, schema, preferences, variables, and folder placement.',
    summary: 'Update a template',
  })
  @ApiOkResponse({ type: TemplateUpdateResponseDto })
  updateTemplate(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
    @Body() body: UpdateTemplateDto,
  ): Promise<TemplateUpdateResponseDto> {
    return this.templatesService.updateTemplate(user, templateId, body);
  }

  @Post(':id/testing-sharing')
  @ApiParam({ description: 'Production template id.', name: 'id' })
  @ApiOperation({
    description:
      'Shares or unshares a production template with the linked testing account for DocuSeal-style test mode.',
    summary: 'Toggle test-mode template sharing',
  })
  @ApiOkResponse({ type: TemplateResponseDto })
  updateTestingSharing(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
    @Body('value') value: boolean,
  ): Promise<TemplateResponseDto> {
    return this.templatesService.updateTestingSharing(user, templateId, value);
  }

  @Get(':id/documents')
  @ApiParam({ description: 'Template id.', name: 'id' })
  @ApiOperation({
    description:
      'Returns signed download URLs for the source PDF documents backing the template.',
    summary: 'Get template document URLs',
  })
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
  @ApiParam({ description: 'Template id.', name: 'id' })
  @ApiOperation({
    description:
      'Replaces, appends, removes, or reorders template documents while preserving compatible field/schema metadata where possible.',
    summary: 'Update template documents',
  })
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

  @Put(':id/google-drive-documents')
  @ApiParam({ description: 'Template id.', name: 'id' })
  @ApiOperation({
    description:
      'Imports Google Drive PDFs, images, or Workspace files using a short-lived Google access token. This is a Signa extension for the DocuSeal Google Drive UI flow.',
    summary: 'Import Google Drive documents',
  })
  @ApiOkResponse({ type: TemplateDocumentsUpdateResponseDto })
  importGoogleDriveDocuments(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
    @Body() body: ImportGoogleDriveDocumentsDto,
  ): Promise<TemplateDocumentsUpdateResponseDto> {
    return this.templatesService.importGoogleDriveDocuments(
      user,
      templateId,
      body,
    );
  }

  @Delete(':id')
  @ApiParam({ description: 'Template id.', name: 'id' })
  @ApiOperation({
    description:
      'Archives a template by default. Pass permanently=true to hard-delete it when allowed.',
    summary: 'Archive or delete a template',
  })
  @ApiOkResponse({ type: TemplateDeleteResponseDto })
  deleteTemplate(
    @CurrentUser() user: User,
    @Param('id') templateId: string,
    @Query() query: DeleteTemplateQueryDto,
  ): Promise<TemplateDeleteResponseDto> {
    return this.templatesService.deleteTemplate(user, templateId, query);
  }
}
