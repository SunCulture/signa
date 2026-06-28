import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export type DeleteTemplateFolderMode = 'folder_only' | 'with_contents';

export class DeleteTemplateFolderQueryDto {
  @ApiPropertyOptional({
    enum: ['folder_only', 'with_contents'],
    example: 'folder_only',
  })
  @IsOptional()
  @IsIn(['folder_only', 'with_contents'])
  mode?: DeleteTemplateFolderMode;
}
