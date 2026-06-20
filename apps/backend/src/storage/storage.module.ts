import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageAttachment } from './entities/storage-attachment.entity';
import { StorageBlob } from './entities/storage-blob.entity';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StorageBlob, StorageAttachment])],
  providers: [StorageService],
  controllers: [StorageController],
  exports: [StorageService, TypeOrmModule],
})
export class StorageModule {}
