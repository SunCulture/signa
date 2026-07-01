import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { CreateTemplateHtmlDocumentDto } from '../../templates/dto/create-template-from-html.dto';
import {
  CreateSubmissionDto,
  CreateSubmissionSubmitterDto,
} from './create-submission.dto';

export class CreateSubmissionFromHtmlDto extends OmitType(CreateSubmissionDto, [
  'template_id',
] as const) {
  @ApiProperty({
    description:
      'HTML documents with DocuSeal field tags to render into temporary backing PDFs before creating submitters.',
    type: [CreateTemplateHtmlDocumentDto],
  })
  @IsArray()
  documents: CreateTemplateHtmlDocumentDto[];

  @ApiProperty({
    description:
      'Recipients and roles for the generated submission. Roles must match HTML field tag roles.',
    type: [CreateSubmissionSubmitterDto],
  })
  @IsArray()
  submitters: CreateSubmissionSubmitterDto[];

  @ApiPropertyOptional({
    description:
      'Existing template ids to use as backing documents together with HTML-rendered documents.',
    example: ['1000001'],
  })
  @IsOptional()
  @IsArray()
  template_ids?: string[];

  @ApiPropertyOptional({
    description:
      'Folder name/path for the temporary backing template created from these HTML documents.',
    example: 'Default',
  })
  @IsOptional()
  @IsString()
  folder_name?: string;
}
