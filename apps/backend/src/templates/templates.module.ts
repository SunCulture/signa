import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { DocumentConversionService } from './document-conversion.service';
import { DocxFieldTagService } from './docx-field-tag.service';
import { DynamicDocumentVersion } from './entities/dynamic-document-version.entity';
import { DynamicDocument } from './entities/dynamic-document.entity';
import { TemplateAccess } from './entities/template-access.entity';
import { TemplateFolder } from './entities/template-folder.entity';
import { TemplateSharing } from './entities/template-sharing.entity';
import { TemplateVersion } from './entities/template-version.entity';
import { Template } from './entities/template.entity';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { PdfAcroFormService } from './pdf-acro-form/pdf-acro-form.service';

@Module({
  imports: [
    AuthModule,
    StorageModule,
    UsersModule,
    TypeOrmModule.forFeature([
      Template,
      TemplateFolder,
      TemplateAccess,
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
    DocumentConversionService,
    DocxFieldTagService,
  ],
  exports: [TemplatesService, TypeOrmModule],
})
export class TemplatesModule {}
