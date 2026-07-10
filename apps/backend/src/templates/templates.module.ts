import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AccountsModule } from '../accounts/accounts.module';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { PdfProcessingModule } from '../pdf-processing/pdf-processing.module';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { DocumentConversionService } from './document-conversion.service';
import { DocxFieldTagService } from './docx-field-tag.service';
import { DocxVariableService } from './docx-variable.service';
import { DynamicDocumentVersion } from './entities/dynamic-document-version.entity';
import { DynamicDocument } from './entities/dynamic-document.entity';
import { TemplateAccess } from './entities/template-access.entity';
import { TemplateEvent } from './entities/template-event.entity';
import { TemplateFolder } from './entities/template-folder.entity';
import { TemplateSharing } from './entities/template-sharing.entity';
import { TemplateVersion } from './entities/template-version.entity';
import { Template } from './entities/template.entity';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { PdfAcroFormService } from './pdf-acro-form/pdf-acro-form.service';
import { PdfTextTagService } from './pdf-text-tag.service';
import { PdfXfaFormService } from './pdf-xfa-form/pdf-xfa-form.service';

@Module({
  imports: [
    AuthModule,
    AccountsModule,
    PdfProcessingModule,
    StorageModule,
    UsersModule,
    TypeOrmModule.forFeature([
      Template,
      TemplateFolder,
      TemplateAccess,
      TemplateEvent,
      TemplateSharing,
      TemplateVersion,
      DynamicDocument,
      DynamicDocumentVersion,
    ]),
  ],
  controllers: [TemplatesController],
  providers: [
    TemplatesService,
    UserHydrationGuard,
    PdfAcroFormService,
    PdfXfaFormService,
    DocumentConversionService,
    DocxFieldTagService,
    DocxVariableService,
    PdfTextTagService,
  ],
  exports: [TemplatesService, TypeOrmModule],
})
export class TemplatesModule {}
