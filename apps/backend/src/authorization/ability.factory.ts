import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';
import { AuthorizationAction } from './authorization-actions';
import type { AppAbility } from './app-ability';
import type { User } from '../users/entities/user.entity';

@Injectable()
export class AbilityFactory {
  createForUser(user: User): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.role === 'admin') {
      can(AuthorizationAction.Manage, 'all');
      return build();
    }

    if (user.role === 'editor') {
      can(AuthorizationAction.Read, 'all');
      can(AuthorizationAction.Manage, 'Template');
      can(AuthorizationAction.Manage, 'Submission');
      can(AuthorizationAction.Send, 'Submission');
      return build();
    }

    if (user.role === 'agent') {
      can(AuthorizationAction.Read, 'Team');
      can(AuthorizationAction.Read, 'Template');
      can(AuthorizationAction.Read, 'Submission');
      can(AuthorizationAction.Send, 'Submission');
      return build();
    }

    if (user.role === 'member') {
      can(AuthorizationAction.Read, 'Team');
      can(AuthorizationAction.Read, 'Template');
      can(AuthorizationAction.Read, 'Submission');
      can(AuthorizationAction.Create, 'Template');
      can(AuthorizationAction.Create, 'Submission');
      return build();
    }

    can(AuthorizationAction.Read, 'Team');
    can(AuthorizationAction.Read, 'Template');
    can(AuthorizationAction.Read, 'Submission');

    return build();
  }
}
