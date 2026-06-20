import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserHydrationGuard } from '../auth/guards/user-hydration/user-hydration.guard';
import { AuthorizationModule } from '../authorization/authorization.module';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { TeamInvitation } from './entities/team-invitation.entity';
import { TeamMember } from './entities/team-member.entity';
import { Team } from './entities/team.entity';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    AuthorizationModule,
    TypeOrmModule.forFeature([Team, TeamMember, TeamInvitation, User]),
  ],
  providers: [TeamsService, UserHydrationGuard],
  exports: [TeamsService, TypeOrmModule],
  controllers: [TeamsController],
})
export class TeamsModule {}
