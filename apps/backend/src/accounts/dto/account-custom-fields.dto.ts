import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class AccountCustomFieldResponseDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  value!: Record<string, unknown>[];
}

export class UpdateAccountCustomFieldsDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  @IsArray()
  value!: Record<string, unknown>[];
}
