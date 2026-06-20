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
  @ApiProperty({ type: [CreateTemplatePdfDocumentDto] })
  @IsOptional()
  @IsArray()
  documents?: CreateTemplatePdfDocumentDto[];

  @ApiProperty({ type: [CreateSubmissionSubmitterDto] })
  @IsArray()
  submitters: CreateSubmissionSubmitterDto[];

  @ApiPropertyOptional({ example: ['1000001'] })
  @IsOptional()
  @IsArray()
  template_ids?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  flatten?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  remove_tags?: boolean;

  @ApiPropertyOptional({ example: 'Default' })
  @IsOptional()
  @IsString()
  folder_name?: string;
}
