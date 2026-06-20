import { ApiProperty } from '@nestjs/swagger';

export class SendEmailResponseDto {
  @ApiProperty({ example: 1 })
  count!: number;

  @ApiProperty({ example: 'Email queued' })
  message!: string;
}
