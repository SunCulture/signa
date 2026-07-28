import { ApiProperty } from '@nestjs/swagger';

export class RegistrationStatusDto {
  @ApiProperty({
    description:
      'Registration mode configured for this deployment. open is public signup, initial_only allows only the first user bootstrap, and disabled blocks self-service registration.',
    enum: ['open', 'initial_only', 'disabled'],
    example: 'initial_only',
  })
  mode!: 'open' | 'initial_only' | 'disabled';

  @ApiProperty({
    description:
      'Whether the current deployment will accept a new self-service registration request.',
    example: true,
  })
  can_register!: boolean;

  @ApiProperty({
    description:
      'Human-readable reason when registration is closed. Null when registration is currently available.',
    example:
      'Initial registration is complete. Ask an administrator to invite you.',
    nullable: true,
  })
  reason!: string | null;
}
