import { ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateDocumentResponseDto } from './template-document-response.dto';

export class TemplateDocumentsUpdateResponseDto {
  @ApiPropertyOptional({ example: [{ attachment_uuid: 'uuid', name: 'PDF' }] })
  schema: unknown[];

  @ApiPropertyOptional({ example: null, nullable: true })
  fields: unknown[] | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  submitters: unknown[] | null;

  @ApiPropertyOptional({ type: [TemplateDocumentResponseDto] })
  documents: TemplateDocumentResponseDto[];
}
