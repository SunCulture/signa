import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
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
    ]),
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService, UserHydrationGuard, PdfAcroFormService],
  exports: [TemplatesService, TypeOrmModule],
})
export class TemplatesModule {}
