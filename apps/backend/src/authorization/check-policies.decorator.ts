import { SetMetadata } from '@nestjs/common';
import type { PolicyHandler } from './policy-handler';

export const checkPoliciesMetadataKey = 'check_policies';

export const CheckPolicies = (...handlers: PolicyHandler[]) =>
  SetMetadata(checkPoliciesMetadataKey, handlers);
