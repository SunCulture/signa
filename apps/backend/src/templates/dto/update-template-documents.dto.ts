import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional } from 'class-validator';
import { CreateTemplatePdfDocumentDto } from './create-template-from-pdf.dto';

export class UpdateTemplateDocumentsDto {
  @ApiPropertyOptional({ type: [CreateTemplatePdfDocumentDto] })
  @IsOptional()
  @IsArray()
  documents?: CreateTemplatePdfDocumentDto[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  merge?: boolean;
}
