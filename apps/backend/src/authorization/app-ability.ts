import type { MongoAbility } from '@casl/ability';
import type { AuthorizationAction } from './authorization-actions';
import type { AuthorizationSubject } from './authorization-subjects';

export type AppAbility = MongoAbility<
  [AuthorizationAction, AuthorizationSubject]
>;
