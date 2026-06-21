import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { CreateTemplateDocxDocumentDto } from '../../templates/dto/create-template-from-docx.dto';
import {
  CreateSubmissionDto,
  CreateSubmissionSubmitterDto,
} from './create-submission.dto';

export class CreateSubmissionFromDocxDto extends OmitType(CreateSubmissionDto, [
  'template_id',
] as const) {
  @ApiProperty({ type: [CreateTemplateDocxDocumentDto] })
  @IsArray()
  documents: CreateTemplateDocxDocumentDto[];

  @ApiProperty({ type: [CreateSubmissionSubmitterDto] })
  @IsArray()
  submitters: CreateSubmissionSubmitterDto[];

  @ApiPropertyOptional({
    description: 'Dynamic DOCX content variables.',
    example: { variable_name: 'value' },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiPropertyOptional({ example: ['1000001'] })
  @IsOptional()
  @IsArray()
  template_ids?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  merge_documents?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  remove_tags?: boolean;

  @ApiPropertyOptional({ example: 'Default' })
  @IsOptional()
  @IsString()
  folder_name?: string;
}
