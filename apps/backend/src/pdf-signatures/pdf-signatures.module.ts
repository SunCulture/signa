import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncryptedConfig } from '../accounts/entities/encrypted-config.entity';
import { PdfSignatureService } from './pdf-signature.service';

@Module({
  imports: [TypeOrmModule.forFeature([EncryptedConfig])],
  providers: [PdfSignatureService],
  exports: [PdfSignatureService],
})
export class PdfSignaturesModule {}
