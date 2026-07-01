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
  @ApiProperty({
    description:
      'DOCX documents to render into temporary backing PDFs before creating submitters.',
    type: [CreateTemplateDocxDocumentDto],
  })
  @IsArray()
  documents: CreateTemplateDocxDocumentDto[];

  @ApiProperty({
    description:
      'Recipients and roles for the generated submission. Roles must match supplied field definitions.',
    type: [CreateSubmissionSubmitterDto],
  })
  @IsArray()
  submitters: CreateSubmissionSubmitterDto[];

  @ApiPropertyOptional({
    description: 'Dynamic DOCX content variables.',
    example: { variable_name: 'value' },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Existing template ids to use as backing documents together with DOCX-rendered documents.',
    example: ['1000001'],
  })
  @IsOptional()
  @IsArray()
  template_ids?: string[];

  @ApiPropertyOptional({
    description:
      'When true, renders all DOCX documents into one combined backing template.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  merge_documents?: boolean;

  @ApiPropertyOptional({
    description:
      'Remove embedded DocuSeal text tags from rendered documents where supported.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  remove_tags?: boolean;

  @ApiPropertyOptional({
    description:
      'Folder name/path for the temporary backing template created from these DOCX files.',
    example: 'Default',
  })
  @IsOptional()
  @IsString()
  folder_name?: string;
}
