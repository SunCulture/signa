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
  @ApiProperty({ type: [CreateTemplateHtmlDocumentDto] })
  @IsArray()
  documents: CreateTemplateHtmlDocumentDto[];

  @ApiProperty({ type: [CreateSubmissionSubmitterDto] })
  @IsArray()
  submitters: CreateSubmissionSubmitterDto[];

  @ApiPropertyOptional({ example: ['1000001'] })
  @IsOptional()
  @IsArray()
  template_ids?: string[];

  @ApiPropertyOptional({ example: 'Default' })
  @IsOptional()
  @IsString()
  folder_name?: string;
}
