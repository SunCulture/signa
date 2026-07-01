import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfProcessingModule } from '../pdf-processing/pdf-processing.module';
import { StorageAttachment } from './entities/storage-attachment.entity';
import { StorageBlob } from './entities/storage-blob.entity';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Module({
  imports: [
    PdfProcessingModule,
    TypeOrmModule.forFeature([StorageBlob, StorageAttachment]),
  ],
  providers: [StorageService],
  controllers: [StorageController],
  exports: [StorageService, TypeOrmModule],
})
export class StorageModule {}
