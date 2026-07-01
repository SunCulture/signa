import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { PdfSignaturesModule } from '../pdf-signatures/pdf-signatures.module';
import { StorageAttachment } from '../storage/entities/storage-attachment.entity';
import { CompletedDocument } from '../submissions/entities/completed-document.entity';
import { UsersModule } from '../users/users.module';
import { ToolsController } from './tools.controller';
import { PdfSignatureVerifierService } from './pdf-signature-verifier.service';
import { ToolsService } from './tools.service';

@Module({
  imports: [
    AuthModule,
    PdfSignaturesModule,
    UsersModule,
    TypeOrmModule.forFeature([CompletedDocument, StorageAttachment]),
  ],
  controllers: [ToolsController],
  providers: [ToolsService, PdfSignatureVerifierService, UserHydrationGuard],
})
export class ToolsModule {}
