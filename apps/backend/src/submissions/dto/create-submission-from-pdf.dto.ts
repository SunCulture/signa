import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateTemplatePdfDocumentDto } from '../../templates/dto/create-template-from-pdf.dto';
import {
  CreateSubmissionDto,
  CreateSubmissionSubmitterDto,
} from './create-submission.dto';

export class CreateSubmissionFromPdfDto extends OmitType(CreateSubmissionDto, [
  'template_id',
] as const) {
  @ApiProperty({
    description:
      'PDF documents supplied as JSON. For multipart requests use documents/files/file upload fields instead.',
    type: [CreateTemplatePdfDocumentDto],
  })
  @IsOptional()
  @IsArray()
  documents?: CreateTemplatePdfDocumentDto[];

  @ApiProperty({
    description:
      'Recipients and roles for the generated submission. Roles must match supplied or extracted fields when fields are present.',
    type: [CreateSubmissionSubmitterDto],
  })
  @IsArray()
  submitters: CreateSubmissionSubmitterDto[];

  @ApiPropertyOptional({
    description:
      'Existing template ids to use as backing documents together with uploaded PDFs.',
    example: ['1000001'],
  })
  @IsOptional()
  @IsArray()
  template_ids?: string[];

  @ApiPropertyOptional({
    description:
      'Flatten existing PDF annotations before field detection/rendering.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  flatten?: boolean;

  @ApiPropertyOptional({
    description:
      'Remove embedded DocuSeal text tags such as {{signature}} from generated documents.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  remove_tags?: boolean;

  @ApiPropertyOptional({
    description:
      'Folder name/path for the temporary backing template created from these PDFs.',
    example: 'Default',
  })
  @IsOptional()
  @IsString()
  folder_name?: string;
}
